import { useEffect, useRef } from 'react'

// 5x7 pixel glyphs for the straight-line ACS wordmark.
const GLYPHS: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
}
const WORD = 'ACS'

const SUB = 4 // water cells per logo pixel
const GLYPH_W = 5
const GLYPH_H = 7
const GAP = 2 // logo pixels between letters
const PAD_X = 2
const PAD_Y = 2

const UNITS_X = WORD.length * GLYPH_W + (WORD.length - 1) * GAP + PAD_X * 2
const UNITS_Y = GLYPH_H + PAD_Y * 2
const COLS = UNITS_X * SUB
const ROWS = UNITS_Y * SUB

const DAMPING = 0.965
const REST_THRESHOLD = 0.002

const LOGO_RGB = [255, 253, 247]
const CREST_RGB = [140, 176, 235]

function buildMask(): Uint8Array {
  const mask = new Uint8Array(COLS * ROWS)
  WORD.split('').forEach((letter, index) => {
    const originX = PAD_X + index * (GLYPH_W + GAP)
    GLYPHS[letter].forEach((row, gy) => {
      row.split('').forEach((bit, gx) => {
        if (bit !== '1') return
        const startX = (originX + gx) * SUB
        const startY = (PAD_Y + gy) * SUB
        for (let y = startY; y < startY + SUB; y++) {
          for (let x = startX; x < startX + SUB; x++) mask[y * COLS + x] = 1
        }
      })
    })
  })
  return mask
}

export default function RippleLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const mask = buildMask()
    let current = new Float32Array(COLS * ROWS)
    let previous = new Float32Array(COLS * ROWS)
    let cell = 1
    let frame = 0
    let running = false
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const i = y * COLS + x
          const h = Math.max(-1, Math.min(1, current[i]))
          const lift = Math.abs(h)
          if (mask[i]) {
            const mix = Math.min(1, lift * 1.6)
            const r = LOGO_RGB[0] + (CREST_RGB[0] - LOGO_RGB[0]) * mix
            const g = LOGO_RGB[1] + (CREST_RGB[1] - LOGO_RGB[1]) * mix
            const b = LOGO_RGB[2] + (CREST_RGB[2] - LOGO_RGB[2]) * mix
            const size = cell * (0.8 + h * 0.35)
            const offset = (cell - size) / 2
            ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`
            ctx.fillRect(x * cell + offset, y * cell + offset - h * cell * 0.9, size, size)
          } else if (lift > 0.015) {
            // Open water: only visible while a wave passes through.
            const size = cell * 0.34
            const offset = (cell - size) / 2
            ctx.fillStyle = `rgba(${CREST_RGB[0]},${CREST_RGB[1]},${CREST_RGB[2]},${Math.min(0.7, lift * 2.2)})`
            ctx.fillRect(x * cell + offset, y * cell + offset - h * cell * 0.9, size, size)
          }
        }
      }
    }

    // Classic two-buffer height-field water simulation.
    function step(): number {
      let energy = 0
      for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
          const i = y * COLS + x
          const next =
            ((current[i - 1] + current[i + 1] + current[i - COLS] + current[i + COLS]) / 2 -
              previous[i]) *
            DAMPING
          previous[i] = next
          energy = Math.max(energy, Math.abs(next))
        }
      }
      const swap = current
      current = previous
      previous = swap
      return energy
    }

    function tick() {
      const energy = step()
      draw()
      if (energy > REST_THRESHOLD) {
        frame = requestAnimationFrame(tick)
      } else {
        running = false
        current.fill(0)
        previous.fill(0)
        draw()
      }
    }

    function disturb(cx: number, cy: number, strength: number) {
      const radius = 2
      for (let y = cy - radius; y <= cy + radius; y++) {
        for (let x = cx - radius; x <= cx + radius; x++) {
          if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) continue
          const distance = Math.hypot(x - cx, y - cy)
          if (distance <= radius) current[y * COLS + x] -= strength * (1 - distance / (radius + 1))
        }
      }
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }

    function resize() {
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = canvas.clientWidth
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(((width * ROWS) / COLS) * dpr)
      cell = canvas.width / COLS
      draw()
    }

    function onPointerMove(event: PointerEvent) {
      if (reduceMotion || !canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = Math.floor(((event.clientX - rect.left) / rect.width) * COLS)
      const y = Math.floor(((event.clientY - rect.top) / rect.height) * ROWS)
      disturb(x, y, 0.55)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    // One drop when the logo first scrolls into view, as a hint that it reacts.
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (reduceMotion || !entries[0]?.isIntersecting) return
        disturb(Math.floor(COLS / 2), Math.floor(ROWS / 2), 1.4)
        intersectionObserver.disconnect()
      },
      { threshold: 0.6 },
    )
    intersectionObserver.observe(canvas)

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerMove)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="ripple-logo"
      style={{ aspectRatio: `${COLS} / ${ROWS}` }}
      role="img"
      aria-label="ACS"
    />
  )
}
