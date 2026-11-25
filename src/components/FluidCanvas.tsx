import { useEffect, useRef, type RefObject } from 'react'
import type { FluidStats } from '../sim/fluid'
import { FluidEngine, type BallInfo, type EngineMessage } from '../sim/engine'

interface Props {
  // Element that receives pointer input; the canvas fills it.
  hostRef: RefObject<HTMLElement | null>
  statsRef: { current: FluidStats | null }
}

type Reply = { type: 'stats'; stats: FluidStats } | { type: 'ball'; ball: BallInfo }

// The simulation and drawing run in a Web Worker on an OffscreenCanvas. This component
// only measures the layout, forwards pointer input and relays stats for the readout.
export default function FluidCanvas({ hostRef, statsRef }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const host = hostRef.current
    if (!wrap || !host) return

    // A fresh canvas per mount: control of a canvas can only be transferred once.
    const canvas = document.createElement('canvas')
    wrap.appendChild(canvas)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let ball: BallInfo | null = null
    let onScreen = true
    let width = 0
    let height = 0
    let labelDpr = 0
    let home = { x: 0, y: 0 }
    const pointer = { x: 0, y: 0, tracking: false, dragging: false }

    function receive(reply: Reply) {
      if (reply.type === 'stats') statsRef.current = reply.stats
      else ball = reply.ball
    }

    let send: (message: EngineMessage, transfer?: Transferable[]) => void
    let dispose: () => void
    if ('transferControlToOffscreen' in canvas) {
      const worker = new Worker(new URL('../sim/worker.ts', import.meta.url), { type: 'module' })
      const offscreen = canvas.transferControlToOffscreen()
      worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen])
      worker.onmessage = (event: MessageEvent<Reply>) => receive(event.data)
      send = (message, transfer = []) => worker.postMessage(message, transfer)
      dispose = () => worker.terminate()
    } else {
      const engine = new FluidEngine(canvas, {
        stats: (stats) => receive({ type: 'stats', stats }),
        ball: (info) => receive({ type: 'ball', ball: info }),
      })
      send = (message) => engine.receive(message)
      dispose = () => engine.stop()
    }

    function build() {
      width = canvas.clientWidth
      height = canvas.clientHeight
      if (!width || !height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const narrow = width < 820
      home = ballHome(narrow)
      send({ type: 'build', setup: { width, height, dpr, narrow, homeX: home.x, homeY: home.y, reduceMotion } })
      if (dpr !== labelDpr) {
        labelDpr = dpr
        void sendLabel(dpr)
      }
    }

    // The worker has no access to the page's web fonts, so the "D" over the ball is
    // rendered here and handed over as a bitmap.
    async function sendLabel(dpr: number) {
      const font = `${11 * dpr}px 'JetBrains Mono Variable', ui-monospace, monospace`
      await document.fonts.load(font).catch(() => undefined)
      const scratch = document.createElement('canvas')
      const c = scratch.getContext('2d')
      if (!c) return
      c.font = font
      scratch.width = Math.ceil(c.measureText('D').width) + 2
      scratch.height = Math.ceil(14 * dpr)
      c.font = font
      c.fillStyle = 'rgba(255, 253, 247, 0.75)'
      c.textAlign = 'center'
      c.textBaseline = 'bottom'
      c.fillText('D', scratch.width / 2, scratch.height)
      const bitmap = await createImageBitmap(scratch)
      send({ type: 'label', bitmap }, [bitmap])
    }

    // Park the ball in open water: right of the text on wide screens, between the
    // text and the equations strip on narrow ones. Returns fractions of the canvas.
    function ballHome(narrow: boolean) {
      const box = canvas.getBoundingClientRect()
      if (!box.width || !box.height) return home
      let textRight = box.left + box.width * 0.5
      let textBottom = box.top
      host!.querySelectorAll('[data-fluid-text]').forEach((el) => {
        const r = el.getBoundingClientRect()
        textRight = Math.max(textRight, r.right)
        textBottom = Math.max(textBottom, r.bottom)
      })
      const floor = host!.querySelector('[data-fluid-floor]')?.getBoundingClientRect().top ?? box.bottom
      const right = textRight - box.left
      const bottom = textBottom - box.top
      const floorY = floor - box.top
      // Halfway between the buttons and the equations.
      if (narrow) return { x: 0.3, y: (bottom + floorY) / 2 / box.height }
      // Well clear of the text: at least 70% across, or 45% of the way into the open water.
      const x = Math.max(0.7, (right + (box.width - right) * 0.45) / box.width)
      return { x: Math.min(x, 0.82), y: (floorY * 0.48) / box.height }
    }

    function updateRunning() {
      send({ type: 'run', running: !reduceMotion && onScreen && !document.hidden })
    }

    function toGrid(event: PointerEvent, info: BallInfo) {
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((event.clientX - rect.left) / rect.width) * info.cols + 0.5,
        y: ((event.clientY - rect.top) / rect.height) * info.rows + 0.5,
      }
    }

    function isOnBall(info: BallInfo, x: number, y: number) {
      return Math.hypot(x - info.x, y - info.y) <= info.r * 1.4
    }

    function onPointerDown(event: PointerEvent) {
      if (!ball || reduceMotion) return
      if ((event.target as Element).closest('a, button, input, textarea, select')) return
      const g = toGrid(event, ball)
      if (!isOnBall(ball, g.x, g.y)) return
      pointer.dragging = true
      send({ type: 'grab', x: g.x, y: g.y })
      host!.setPointerCapture(event.pointerId)
      host!.style.cursor = 'grabbing'
      event.preventDefault()
    }

    function onPointerMove(event: PointerEvent) {
      if (!ball || reduceMotion) return
      const g = toGrid(event, ball)
      if (pointer.dragging) {
        send({ type: 'drag', x: g.x, y: g.y })
      } else {
        if (pointer.tracking) send({ type: 'stir', x: g.x, y: g.y, dx: g.x - pointer.x, dy: g.y - pointer.y })
        host!.style.cursor = event.pointerType === 'mouse' && isOnBall(ball, g.x, g.y) ? 'grab' : ''
      }
      pointer.x = g.x
      pointer.y = g.y
      pointer.tracking = true
    }

    function onPointerUp() {
      if (pointer.dragging) send({ type: 'release' })
      pointer.dragging = false
      host!.style.cursor = ''
    }

    function onPointerLeave() {
      pointer.tracking = false
    }

    let lastWidth = 0
    const resizeObserver = new ResizeObserver(() => {
      // Mobile address bars change the height while scrolling; only rebuild on real resizes.
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (Math.abs(w - lastWidth) < 2 && width && Math.abs(h - height) < 120) return
      lastWidth = w
      build()
    })
    resizeObserver.observe(canvas)

    // The text and equations can change size after the first build (web fonts
    // arriving, MathML rendering), so re-measure the ball's home when they do.
    function updateHome() {
      if (!width || !height || !canvas.isConnected) return
      const next = ballHome(width < 820)
      if (Math.abs(next.x - home.x) * width < 2 && Math.abs(next.y - home.y) * height < 2) return
      home = next
      send({ type: 'home', x: home.x, y: home.y })
    }
    const layoutObserver = new ResizeObserver(updateHome)
    host.querySelectorAll('[data-fluid-text], [data-fluid-floor]').forEach((el) => layoutObserver.observe(el))
    void document.fonts.ready.then(updateHome)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      updateRunning()
    })
    intersectionObserver.observe(host)

    host.addEventListener('pointerdown', onPointerDown)
    host.addEventListener('pointermove', onPointerMove)
    host.addEventListener('pointerup', onPointerUp)
    host.addEventListener('pointercancel', onPointerUp)
    host.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', updateRunning)

    build()
    updateRunning()

    return () => {
      dispose()
      resizeObserver.disconnect()
      layoutObserver.disconnect()
      intersectionObserver.disconnect()
      host.removeEventListener('pointerdown', onPointerDown)
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerup', onPointerUp)
      host.removeEventListener('pointercancel', onPointerUp)
      host.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', updateRunning)
      canvas.remove()
    }
  }, [hostRef, statsRef])

  return <div ref={wrapRef} className="fluid-canvas" aria-hidden="true" />
}
