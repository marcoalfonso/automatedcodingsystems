// Streaklines: chains of particles released from fixed points at the inlet and
// carried by the simulated flow, like smoke wires in a wind tunnel. Each chain is
// drawn as a smooth curve, so it stays sharp at any screen resolution even though
// the velocity grid underneath is coarse.
//
// Points are stored oldest (downstream) first as flat [x, y, age] triples in grid
// coordinates. Each step every point is moved with a midpoint (RK2) integration of
// the velocity field, stretched segments get extra points so curves stay smooth,
// crowded points are thinned, and a fresh point is released at the inlet.

import type { FluidSim } from './fluid'

const MAX_POINTS = 1600 // per streak; the oldest points are dropped beyond this
const MAX_SEGMENT = 1 // cells; longer segments get points inserted
const MIN_SEGMENT = 0.3 // cells; closer points are merged
const RELEASE_SPACING = 1 // cells between released points
const BALL_CLEARANCE = 0.3 // keep points just outside the ball surface

export interface Streak {
  y0: number
  points: Float32Array
  count: number
  scratch: Float32Array
}

export class Streaklines {
  readonly streaks: Streak[] = []
  // Frames a point lives before it has fully faded out.
  readonly lifetime: number
  private readonly sim: FluidSim
  private readonly v1 = { x: 0, y: 0 }
  private readonly v2 = { x: 0, y: 0 }

  constructor(sim: FluidSim) {
    this.sim = sim
    this.lifetime = (sim.cols / sim.inflow) * 1.5

    for (const y0 of this.releaseRows()) {
      // Up to three points can be inserted per point in one pass, so leave room.
      const capacity = MAX_POINTS * 4 * 3
      const streak: Streak = {
        y0,
        points: new Float32Array(capacity),
        count: 0,
        scratch: new Float32Array(capacity),
      }
      // Start as a straight line across the screen so the first frame is settled.
      for (let x = sim.cols; x >= 0.5; x -= RELEASE_SPACING) {
        const o = streak.count * 3
        streak.points[o] = x
        streak.points[o + 1] = y0
        streak.points[o + 2] = (x - 0.5) / sim.inflow
        streak.count++
      }
      this.streaks.push(streak)
    }
  }

  // Even spacing across the height, with a denser band level with the ball so its
  // wake is always well drawn.
  private releaseRows() {
    const { rows, ball } = this.sim
    const spacing = Math.max(4, rows / 22)
    const ys: number[] = []
    for (let y = spacing / 2; y < rows; y += spacing) ys.push(y)
    for (let y = ball.homeY - ball.r * 1.3; y <= ball.homeY + ball.r * 1.3; y += 2) {
      if (ys.every((existing) => Math.abs(existing - y) > 1.5)) ys.push(y)
    }
    return ys.sort((a, b) => a - b)
  }

  step() {
    for (const streak of this.streaks) {
      this.advect(streak)
      this.rebuild(streak)
      this.release(streak)
    }
  }

  private advect(streak: Streak) {
    const { sim, v1, v2 } = this
    const { ball } = sim
    const p = streak.points
    const reach = ball.r + BALL_CLEARANCE
    const maxY = sim.rows + 0.5
    for (let k = 0; k < streak.count; k++) {
      const o = k * 3
      let x = p[o]
      let y = p[o + 1]
      sim.velocityAt(x, y, v1)
      sim.velocityAt(x + 0.5 * v1.x, y + 0.5 * v1.y, v2)
      x += v2.x
      y += v2.y
      // A point pushed into the ball (for example while it is dragged) goes back to its surface.
      const dx = x - ball.x
      const dy = y - ball.y
      const d = Math.hypot(dx, dy)
      if (d < reach && d > 1e-6) {
        x = ball.x + (dx * reach) / d
        y = ball.y + (dy * reach) / d
      }
      p[o] = x
      p[o + 1] = y < 0.5 ? 0.5 : y > maxY ? maxY : y
      p[o + 2] += 1
    }
  }

  private rebuild(streak: Streak) {
    const p = streak.points
    const q = streak.scratch
    const maxX = this.sim.cols + 0.5
    let m = 0
    for (let k = 0; k < streak.count; k++) {
      const o = k * 3
      const x = p[o]
      const y = p[o + 1]
      const age = p[o + 2]
      if (x > maxX || x < 0 || age > this.lifetime) continue
      if (m > 0) {
        const po = (m - 1) * 3
        const px = q[po]
        const py = q[po + 1]
        const pa = q[po + 2]
        const d = Math.hypot(x - px, y - py)
        if (d < MIN_SEGMENT && k < streak.count - 1) continue
        if (d > MAX_SEGMENT) {
          const pieces = Math.min(4, Math.ceil(d / MAX_SEGMENT))
          for (let t = 1; t < pieces; t++) {
            const f = t / pieces
            const io = m * 3
            q[io] = px + (x - px) * f
            q[io + 1] = py + (y - py) * f
            q[io + 2] = pa + (age - pa) * f
            m++
          }
        }
      }
      const wo = m * 3
      q[wo] = x
      q[wo + 1] = y
      q[wo + 2] = age
      m++
    }
    if (m > MAX_POINTS) {
      q.copyWithin(0, (m - MAX_POINTS) * 3, m * 3)
      m = MAX_POINTS
    }
    streak.points = q
    streak.scratch = p
    streak.count = m
  }

  private release(streak: Streak) {
    const p = streak.points
    const m = streak.count
    if (m > 0) {
      const o = (m - 1) * 3
      if (Math.hypot(p[o] - 0.5, p[o + 1] - streak.y0) < RELEASE_SPACING) return
    }
    const o = m * 3
    p[o] = 0.5
    p[o + 1] = streak.y0
    p[o + 2] = 0
    streak.count = m + 1
  }
}
