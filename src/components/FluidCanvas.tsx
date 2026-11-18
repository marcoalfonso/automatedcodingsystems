import { useEffect, useRef, type RefObject } from 'react'
import { FluidSim, type FluidStats } from '../sim/fluid'

interface Props {
  // Element that receives pointer input; the canvas fills it.
  hostRef: RefObject<HTMLElement | null>
  statsRef: { current: FluidStats | null }
}

const STEP_MS = 1000 / 60
const BACKGROUND = [14, 29, 58]
const DYE_LOW = [95, 134, 201]
const DYE_HIGH = [255, 253, 247]
const SPIN_POSITIVE = [70, 112, 186]
const SPIN_NEGATIVE = [176, 92, 72]

export default function FluidCanvas({ hostRef, statsRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    const ctx = canvas?.getContext('2d')
    const buffer = document.createElement('canvas')
    const bufferCtx = buffer.getContext('2d')
    if (!canvas || !host || !ctx || !bufferCtx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let sim: FluidSim | null = null
    let image: ImageData | null = null
    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0
    let last = 0
    let backlog = 0
    let onScreen = true
    const pointer = { x: 0, y: 0, tracking: false, dragging: false }

    function build() {
      if (!canvas || !bufferCtx) return
      width = canvas.clientWidth
      height = canvas.clientHeight
      if (!width || !height) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)

      const narrow = width < 820
      const cols = Math.max(90, Math.min(220, Math.round(width / 6.5)))
      const rows = Math.max(40, Math.round((cols * height) / width))
      const home = ballHome(narrow)
      sim = new FluidSim(cols, rows, {
        inflow: 0.55,
        reynolds: 220,
        ballX: home.x,
        ballY: home.y,
        ballRadius: narrow ? cols * 0.065 : rows * 0.065,
      })
      buffer.width = cols
      buffer.height = rows
      image = bufferCtx.createImageData(cols, rows)

      const warmup = reduceMotion ? 240 : 40
      for (let n = 0; n < warmup; n++) sim.step()
      statsRef.current = sim.stats()
      draw()
    }

    // Park the ball in open water: right of the text on wide screens, between the
    // text and the equations strip on narrow ones. Returns fractions of the canvas.
    function ballHome(narrow: boolean) {
      const box = canvas!.getBoundingClientRect()
      let textRight = box.left + box.width * 0.5
      let textBottom = box.top + box.height * 0.5
      host!.querySelectorAll('[data-fluid-text]').forEach((el) => {
        const r = el.getBoundingClientRect()
        textRight = Math.max(textRight, r.right)
        textBottom = Math.max(textBottom, r.bottom)
      })
      const floor = host!.querySelector('[data-fluid-floor]')?.getBoundingClientRect().top ?? box.bottom
      const right = textRight - box.left
      const bottom = textBottom - box.top
      const floorY = floor - box.top
      if (narrow) return { x: 0.3, y: (bottom + floorY) / 2 / box.height }
      // Well clear of the text: at least 70% across, or 45% of the way into the open water.
      const x = Math.max(0.7, (right + (box.width - right) * 0.45) / box.width)
      return { x: Math.min(x, 0.82), y: (floorY * 0.48) / box.height }
    }

    function draw() {
      if (!sim || !image || !ctx || !bufferCtx || !canvas) return
      const { cols, rows, stride: S, dye, curl } = sim
      const data = image.data
      let p = 0
      for (let j = 1; j <= rows; j++) {
        for (let i = 1; i <= cols; i++) {
          const k = i + j * S
          let r = BACKGROUND[0]
          let g = BACKGROUND[1]
          let b = BACKGROUND[2]

          // Faint two-tone tint for the direction of spin.
          const w = Math.max(-1, Math.min(1, curl[k] * 5))
          const spin = w > 0 ? SPIN_POSITIVE : SPIN_NEGATIVE
          const sa = Math.abs(w) * 0.35
          r += (spin[0] - r) * sa
          g += (spin[1] - g) * sa
          b += (spin[2] - b) * sa

          // Dye goes from blue at low concentration to cream at full.
          const d = Math.min(1, dye[k])
          r += (DYE_LOW[0] + (DYE_HIGH[0] - DYE_LOW[0]) * d - r) * d
          g += (DYE_LOW[1] + (DYE_HIGH[1] - DYE_LOW[1]) * d - g) * d
          b += (DYE_LOW[2] + (DYE_HIGH[2] - DYE_LOW[2]) * d - b) * d

          data[p] = r
          data[p + 1] = g
          data[p + 2] = b
          data[p + 3] = 255
          p += 4
        }
      }
      bufferCtx.putImageData(image, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height)
      drawBall()
    }

    function drawBall() {
      if (!sim || !ctx || !canvas) return
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
      ctx.fillStyle = 'rgba(255, 253, 247, 0.75)'
      ctx.font = `${11 * dpr}px 'JetBrains Mono Variable', ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText('D', cx, y - 4 * dpr)
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (!sim) return
      if (!last) last = now
      backlog += Math.min(now - last, 100)
      last = now
      // Fixed 60 Hz physics so high refresh screens don't run the flow faster.
      let steps = 0
      while (backlog >= STEP_MS && steps < 2) {
        sim.step()
        backlog -= STEP_MS
        steps++
      }
      if (steps === 2) backlog = 0
      if (!steps) return
      draw()
      if (sim.frame % 12 === 0) statsRef.current = sim.stats()
    }

    function start() {
      if (raf || reduceMotion || !onScreen || document.hidden) return
      last = 0
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      cancelAnimationFrame(raf)
      raf = 0
    }

    function toGrid(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      return {
        x: ((event.clientX - rect.left) / rect.width) * sim!.cols + 0.5,
        y: ((event.clientY - rect.top) / rect.height) * sim!.rows + 0.5,
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!sim || reduceMotion) return
      if ((event.target as Element).closest('a, button, input, textarea, select')) return
      const g = toGrid(event)
      if (!sim.isOnBall(g.x, g.y)) return
      pointer.dragging = true
      sim.grab(g.x, g.y)
      host!.setPointerCapture(event.pointerId)
      host!.style.cursor = 'grabbing'
      event.preventDefault()
    }

    function onPointerMove(event: PointerEvent) {
      if (!sim || reduceMotion) return
      const g = toGrid(event)
      if (pointer.dragging) {
        sim.drag(g.x, g.y)
      } else {
        if (pointer.tracking) sim.stir(g.x, g.y, g.x - pointer.x, g.y - pointer.y)
        host!.style.cursor = event.pointerType === 'mouse' && sim.isOnBall(g.x, g.y) ? 'grab' : ''
      }
      pointer.x = g.x
      pointer.y = g.y
      pointer.tracking = true
    }

    function onPointerUp() {
      if (pointer.dragging) sim?.release()
      pointer.dragging = false
      if (host) host.style.cursor = ''
    }

    function onPointerLeave() {
      pointer.tracking = false
    }

    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    let lastWidth = 0
    const resizeObserver = new ResizeObserver(() => {
      // Mobile address bars change the height while scrolling; only rebuild on real resizes.
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (Math.abs(w - lastWidth) < 2 && sim && Math.abs(h - height) < 120) return
      lastWidth = w
      build()
    })
    resizeObserver.observe(canvas)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (onScreen) start()
      else stop()
    })
    intersectionObserver.observe(host)

    host.addEventListener('pointerdown', onPointerDown)
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerup', onPointerUp)
    host.addEventListener('pointercancel', onPointerUp)
    host.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)

    build()
    start()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      host.removeEventListener('pointerdown', onPointerDown)
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerup', onPointerUp)
      host.removeEventListener('pointercancel', onPointerUp)
      host.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [hostRef, statsRef])

  return <canvas ref={canvasRef} className="fluid-canvas" aria-hidden="true" />
}
