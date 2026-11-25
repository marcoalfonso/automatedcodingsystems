// Runs the fluid simulation and draws it onto a canvas. It has no DOM access, so it
// can run inside a Web Worker on an OffscreenCanvas (the normal path), or on the
// main thread with a regular canvas where OffscreenCanvas isn't supported.

import { FluidSim, type FluidStats } from './fluid'
import { Streaklines } from './streaks'

export interface Setup {
  width: number // CSS pixels
  height: number
  dpr: number
  narrow: boolean
  homeX: number // ball home, as fractions of the canvas
  homeY: number
  reduceMotion: boolean
}

// Ball position in grid coordinates, sent back so the page can hit-test the pointer.
export interface BallInfo {
  x: number
  y: number
  r: number
  cols: number
  rows: number
}

export type EngineMessage =
  | { type: 'build'; setup: Setup }
  | { type: 'run'; running: boolean }
  | { type: 'label'; bitmap: ImageBitmap }
  | { type: 'grab'; x: number; y: number }
  | { type: 'drag'; x: number; y: number }
  | { type: 'release' }
  | { type: 'home'; x: number; y: number } // fractions of the canvas
  | { type: 'stir'; x: number; y: number; dx: number; dy: number }

export interface EngineEvents {
  stats(stats: FluidStats): void
  ball(ball: BallInfo): void
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas
type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

const STEP_MS = 1000 / 60
const BACKGROUND = [14, 29, 58]
const SPIN_POSITIVE = [70, 112, 186]
const SPIN_NEGATIVE = [176, 92, 72]

// Streakline style.
const RUN = 24 // points per faded run
const OPACITY = 0.42
const LEVELS = 16 // fade steps; runs with the same step are stroked together

const schedule: (callback: (now: number) => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (callback) => requestAnimationFrame(callback)
    : (callback) => setTimeout(() => callback(performance.now()), STEP_MS) as unknown as number
const unschedule: (handle: number) => void =
  typeof cancelAnimationFrame === 'function' ? (handle) => cancelAnimationFrame(handle) : (handle) => clearTimeout(handle)

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export class FluidEngine {
  private readonly canvas: AnyCanvas
  private readonly ctx: Context2D
  private readonly events: EngineEvents
  private readonly buffer: AnyCanvas
  private readonly bufferCtx: Context2D
  private sim: FluidSim | null = null
  private lines: Streaklines | null = null
  private image: ImageData | null = null
  private label: ImageBitmap | null = null
  private dpr = 1
  private running = false
  private handle = 0
  private last = 0
  private backlog = 0
  private levelOf = new Uint8Array(0)

  constructor(canvas: AnyCanvas, events: EngineEvents) {
    this.canvas = canvas
    this.events = events
    this.ctx = canvas.getContext('2d') as Context2D
    this.buffer = makeCanvas(1, 1)
    this.bufferCtx = this.buffer.getContext('2d') as Context2D
  }

  receive(message: EngineMessage) {
    const { sim } = this
    switch (message.type) {
      case 'build':
        this.build(message.setup)
        break
      case 'run':
        if (message.running) this.start()
        else this.stop()
        break
      case 'label':
        this.label?.close()
        this.label = message.bitmap
        if (!this.running) this.draw()
        break
      case 'grab':
        sim?.grab(message.x, message.y)
        break
      case 'drag':
        sim?.drag(message.x, message.y)
        break
      case 'release':
        sim?.release()
        break
      case 'home':
        sim?.setHome(message.x, message.y)
        this.sendBall()
        if (!this.running) this.draw()
        break
      case 'stir':
        sim?.stir(message.x, message.y, message.dx, message.dy)
        break
    }
  }

  private build(setup: Setup) {
    const { width, height, dpr, narrow } = setup
    if (!width || !height) return
    this.dpr = dpr
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)

    const cols = Math.max(90, Math.min(220, Math.round(width / 6.5)))
    const rows = Math.max(40, Math.round((cols * height) / width))
    const sim = new FluidSim(cols, rows, {
      inflow: 0.55,
      reynolds: 220,
      ballX: setup.homeX,
      ballY: setup.homeY,
      ballRadius: narrow ? cols * 0.065 : rows * 0.065,
      trackDye: false,
    })
    const lines = new Streaklines(sim)
    this.sim = sim
    this.lines = lines
    this.buffer.width = cols
    this.buffer.height = rows
    this.image = this.bufferCtx.createImageData(cols, rows)

    const warmup = setup.reduceMotion ? 240 : 40
    for (let n = 0; n < warmup; n++) {
      sim.step()
      lines.step()
    }
    this.events.stats(sim.stats())
    this.sendBall()
    this.draw()
  }

  private start() {
    if (this.running) return
    this.running = true
    this.last = 0
    this.backlog = 0
    this.handle = schedule(this.frame)
  }

  stop() {
    this.running = false
    unschedule(this.handle)
    this.handle = 0
  }

  private frame = (now: number) => {
    if (!this.running) return
    this.handle = schedule(this.frame)
    const { sim, lines } = this
    if (!sim || !lines) return
    if (!this.last) this.last = now
    this.backlog += Math.min(now - this.last, 100)
    this.last = now
    // Fixed 60 Hz physics, at most one step per frame. A machine that can't keep up
    // shows the flow slightly slowed down rather than doing double work to catch up,
    // which would make the next frame late too.
    if (this.backlog < STEP_MS) return
    this.backlog = Math.min(this.backlog - STEP_MS, STEP_MS)
    sim.step()
    lines.step()
    this.draw()
    if (sim.frame % 2 === 0) this.sendBall()
    if (sim.frame % 12 === 0) this.events.stats(sim.stats())
  }

  private sendBall() {
    const { sim } = this
    if (!sim) return
    const { x, y, r } = sim.ball
    this.events.ball({ x, y, r, cols: sim.cols, rows: sim.rows })
  }

  // ---------- Drawing ----------

  private draw() {
    const { sim, image, ctx, canvas } = this
    if (!sim || !image) return
    const { cols, rows, stride: S, curl } = sim
    const data = image.data
    let p = 0
    for (let j = 1; j <= rows; j++) {
      for (let i = 1; i <= cols; i++) {
        const k = i + j * S
        let r = BACKGROUND[0]
        let g = BACKGROUND[1]
        let b = BACKGROUND[2]

        // Soft two-tone glow for the direction of spin, behind the sharp streaklines.
        const w = Math.max(-1, Math.min(1, curl[k] * 5))
        const spin = w > 0 ? SPIN_POSITIVE : SPIN_NEGATIVE
        const sa = Math.abs(w) * 0.45
        r += (spin[0] - r) * sa
        g += (spin[1] - g) * sa
        b += (spin[2] - b) * sa

        data[p] = r
        data[p + 1] = g
        data[p + 2] = b
        data[p + 3] = 255
        p += 4
      }
    }
    this.bufferCtx.putImageData(image, 0, 0)
    // Plain bilinear scaling. 'high' quality looks no different on this soft glow
    // (under 2% difference per pixel) but costs enough to halve the frame rate.
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'low'
    ctx.drawImage(this.buffer, 0, 0, canvas.width, canvas.height)
    this.drawStreaks()
    this.drawBall()
  }

  // Each streak is drawn as quadratic curves through its points, in short runs so
  // older parts of the line can fade out. Runs are grouped by fade level and each
  // group is stroked once, which keeps draw calls to a handful per frame.
  private drawStreaks() {
    const { sim, lines, ctx, canvas, dpr } = this
    if (!sim || !lines) return
    const sx = canvas.width / sim.cols
    const sy = canvas.height / sim.rows
    const fadeStart = lines.lifetime * 0.55
    const fadeLength = lines.lifetime - fadeStart

    // Pass 1: the fade level of every run (0 means invisible).
    let runs = 0
    for (const streak of lines.streaks) runs += Math.ceil(Math.max(0, streak.count - 1) / RUN)
    if (this.levelOf.length < runs) this.levelOf = new Uint8Array(runs * 2)
    const levelOf = this.levelOf
    let used = 0
    let r = 0
    for (const streak of lines.streaks) {
      const p = streak.points
      const n = streak.count
      for (let start = 0; start < n - 1; start += RUN) {
        const end = Math.min(n - 1, start + RUN)
        const age = p[((start + end) >> 1) * 3 + 2]
        const alpha = age < fadeStart ? OPACITY : OPACITY * (1 - (age - fadeStart) / fadeLength)
        const level = alpha < 0.02 ? 0 : Math.max(1, Math.round((alpha / OPACITY) * LEVELS))
        levelOf[r++] = level
        used |= 1 << level
      }
    }

    // Pass 2: one path and one stroke per fade level.
    ctx.save()
    // Pale blue rather than cream, and hairline thin, so the lines read as texture.
    ctx.strokeStyle = '#bccdea'
    ctx.lineWidth = 0.8 * dpr
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let level = 1; level <= LEVELS; level++) {
      if (!(used & (1 << level))) continue
      ctx.globalAlpha = (OPACITY * level) / LEVELS
      ctx.beginPath()
      r = 0
      for (const streak of lines.streaks) {
        const p = streak.points
        const n = streak.count
        for (let start = 0; start < n - 1; start += RUN, r++) {
          if (levelOf[r] !== level) continue
          const end = Math.min(n - 1, start + RUN)
          ctx.moveTo((p[start * 3] - 0.5) * sx, (p[start * 3 + 1] - 0.5) * sy)
          for (let i = start + 1; i < end; i++) {
            const x = (p[i * 3] - 0.5) * sx
            const y = (p[i * 3 + 1] - 0.5) * sy
            const nx = (p[i * 3 + 3] - 0.5) * sx
            const ny = (p[i * 3 + 4] - 0.5) * sy
            ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
          }
          ctx.lineTo((p[end * 3] - 0.5) * sx, (p[end * 3 + 1] - 0.5) * sy)
        }
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawBall() {
    const { sim, ctx, canvas, dpr } = this
    if (!sim) return
    const cell = canvas.width / sim.cols
    const cellY = canvas.height / sim.rows
    const b = sim.ball
    const cx = (b.x - 0.5) * cell
    const cy = (b.y - 0.5) * cellY
    // Slightly larger than the solid region so its stair-stepped edge stays hidden.
    const radius = (b.r + 0.6) * cell

    const shade = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius)
    shade.addColorStop(0, '#ffffff')
    shade.addColorStop(0.7, '#e9e4d9')
    shade.addColorStop(1, '#bfc9da')
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = shade
    ctx.fill()

    // Dimension line for the diameter D used in Re.
    const y = cy - radius - 14 * dpr
    const tick = 4 * dpr
    ctx.strokeStyle = 'rgba(255, 253, 247, 0.55)'
    ctx.lineWidth = dpr
    ctx.beginPath()
    ctx.moveTo(cx - radius, y)
    ctx.lineTo(cx + radius, y)
    ctx.moveTo(cx - radius, y - tick)
    ctx.lineTo(cx - radius, y + tick)
    ctx.moveTo(cx + radius, y - tick)
    ctx.lineTo(cx + radius, y + tick)
    ctx.stroke()
    // The "D" is pre-rendered on the page, where the web font is loaded.
    const label = this.label
    if (label) ctx.drawImage(label, cx - label.width / 2, y - 4 * dpr - label.height)
  }
}
