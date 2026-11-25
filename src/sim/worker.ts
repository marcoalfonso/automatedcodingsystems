// Runs the fluid engine off the main thread so the page stays responsive.
// The first message carries the transferred OffscreenCanvas; the rest are EngineMessages.

import { FluidEngine, type EngineMessage } from './engine'

const scope = self as unknown as {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent) => void) | null
}

let engine: FluidEngine | null = null

scope.onmessage = (event: MessageEvent<EngineMessage | { type: 'init'; canvas: OffscreenCanvas }>) => {
  const message = event.data
  if (message.type === 'init') {
    engine = new FluidEngine(message.canvas, {
      stats: (stats) => scope.postMessage({ type: 'stats', stats }),
      ball: (ball) => scope.postMessage({ type: 'ball', ball }),
    })
    return
  }
  engine?.receive(message)
}
