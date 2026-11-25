// 2D incompressible Navier-Stokes solver on a uniform grid (Stam's "stable fluids").
//
// Each step: vorticity confinement, semi-Lagrangian advection, implicit viscosity,
// then a pressure projection (red-black SOR) that makes the velocity divergence free.
// Dye is carried with MacCormack advection so the streaks stay sharp.
// The ball is a moving solid: cells inside it take the ball's velocity, and the
// pressure solve treats its surface as a wall (Neumann boundary).
//
// Units are grid cells and frames, so a velocity of 1 moves one cell per step.
// The grid has a one-cell border: interior cells are i = 1..cols, j = 1..rows.

export interface FluidStats {
  time: number
  reynolds: number
  divergence: number // RMS of the discrete divergence after projection
  cols: number
  rows: number
}

export interface Ball {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  homeX: number
  homeY: number
  held: boolean
  targetX: number
  targetY: number
}

export interface FluidOptions {
  inflow: number
  reynolds: number
  ballX: number // fraction of width
  ballY: number // fraction of height
  ballRadius: number // in cells
  trackDye?: boolean // advect the dye field (default true)
}

const PRESSURE_ITERATIONS = 16
const SOR = 1.7 // over-relaxation factor for the pressure solve
const VISCOSITY_ITERATIONS = 1 // viscosity is small enough that one sweep converges
const CONFINEMENT = 0.1
const DYE_DECAY = 0.9993
const MAX_SPEED = 3

export class FluidSim {
  readonly cols: number
  readonly rows: number
  readonly stride: number
  readonly inflow: number
  readonly viscosity: number
  readonly ball: Ball
  frame = 0
  readonly trackDye: boolean

  readonly u: Float64Array
  readonly v: Float64Array
  readonly dye: Float64Array
  readonly curl: Float64Array
  readonly solid: Uint8Array
  private readonly u0: Float64Array
  private readonly v0: Float64Array
  private readonly dye0: Float64Array
  private readonly dyeHat: Float64Array
  private readonly dyeBack: Float64Array
  private readonly p: Float64Array
  private readonly div: Float64Array
  private readonly streakSpacing: number
  // Fluid cells split by whether they touch the ball, rebuilt every step so the
  // hot loops over open water need no per-cell branches. Open cells are further
  // split red/black (checkerboard) so neighbouring updates don't wait on each other.
  private readonly red: Int32Array
  private readonly black: Int32Array
  private readonly rim: Int32Array
  private redCount = 0
  private blackCount = 0
  private rimCount = 0
  private readonly streakWidth: number

  constructor(cols: number, rows: number, options: FluidOptions) {
    this.cols = cols
    this.rows = rows
    this.stride = cols + 2
    const size = (cols + 2) * (rows + 2)

    this.u = new Float64Array(size)
    this.v = new Float64Array(size)
    this.u0 = new Float64Array(size)
    this.v0 = new Float64Array(size)
    this.dye = new Float64Array(size)
    this.dye0 = new Float64Array(size)
    this.dyeHat = new Float64Array(size)
    this.dyeBack = new Float64Array(size)
    this.p = new Float64Array(size)
    this.div = new Float64Array(size)
    this.curl = new Float64Array(size)
    this.solid = new Uint8Array(size)
    this.red = new Int32Array(cols * rows)
    this.black = new Int32Array(cols * rows)
    this.rim = new Int32Array(cols * rows)

    this.inflow = options.inflow
    this.trackDye = options.trackDye ?? true
    const r = options.ballRadius
    // Re = U D / nu, so pick nu to hit the requested Reynolds number.
    this.viscosity = (options.inflow * 2 * r) / options.reynolds

    const homeX = 1 + options.ballX * (cols - 1)
    const homeY = 1 + options.ballY * (rows - 1)
    this.ball = { x: homeX, y: homeY, r, vx: 0, vy: 0, homeX, homeY, held: false, targetX: homeX, targetY: homeY }

    this.streakSpacing = Math.max(5, Math.round(rows / 16))
    this.streakWidth = this.streakSpacing > 7 ? 2 : 1

    // Start from uniform flow with straight dye streaks so the first frame already looks settled.
    this.u.fill(options.inflow)
    for (let j = 0; j < rows + 2; j++) {
      if (!this.isStreak(j)) continue
      for (let i = 0; i < cols + 2; i++) this.dye[i + j * this.stride] = 1
    }
  }

  private isStreak(j: number) {
    return j % this.streakSpacing < this.streakWidth
  }

  // ---------- Interaction ----------

  grab(x: number, y: number) {
    const b = this.ball
    b.held = true
    b.targetX = x
    b.targetY = y
  }

  drag(x: number, y: number) {
    this.ball.targetX = x
    this.ball.targetY = y
  }

  release() {
    this.ball.held = false
  }

  isOnBall(x: number, y: number) {
    const b = this.ball
    return Math.hypot(x - b.x, y - b.y) <= b.r * 1.4
  }

  // Push the fluid along the pointer's path and leave a little dye behind it.
  stir(x: number, y: number, dx: number, dy: number) {
    const { u, v, dye, stride: S } = this
    const radius = 4
    const i0 = Math.max(1, Math.floor(x - radius))
    const i1 = Math.min(this.cols, Math.ceil(x + radius))
    const j0 = Math.max(1, Math.floor(y - radius))
    const j1 = Math.min(this.rows, Math.ceil(y + radius))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const d = Math.hypot(i - x, j - y)
        if (d > radius) continue
        const w = 1 - d / radius
        const k = i + j * S
        u[k] = clamp(u[k] + dx * w * 0.5, -MAX_SPEED, MAX_SPEED)
        v[k] = clamp(v[k] + dy * w * 0.5, -MAX_SPEED, MAX_SPEED)
        dye[k] = Math.min(1, dye[k] + w * 0.3)
      }
    }
  }

  // ---------- Time step ----------

  step() {
    this.frame++
    this.updateBall()
    this.markSolid()

    this.computeCurl()
    this.applyConfinement()

    this.u0.set(this.u)
    this.v0.set(this.v)
    this.advect(this.u, this.u0, this.u0, this.v0)
    this.advect(this.v, this.v0, this.u0, this.v0)
    this.setVelocityBounds()
    this.enforceBall()

    this.diffuse(this.u, this.u0)
    this.diffuse(this.v, this.v0)
    this.setVelocityBounds()
    this.enforceBall()

    this.project()
    this.enforceBall()

    if (this.trackDye) {
      this.advectDye()
      this.injectDye()
    }
  }

  // Bilinear velocity at a point in grid coordinates (cell centres sit on integers).
  velocityAt(x: number, y: number, out: { x: number; y: number }) {
    const { cols: W, rows: H, stride: S, u, v } = this
    x = clamp(x, 0.5, W + 0.5)
    y = clamp(y, 0.5, H + 0.5)
    const i0 = x | 0
    const j0 = y | 0
    const s1 = x - i0
    const t1 = y - j0
    const s0 = 1 - s1
    const t0 = 1 - t1
    const a = i0 + j0 * S
    out.x = s0 * (t0 * u[a] + t1 * u[a + S]) + s1 * (t0 * u[a + 1] + t1 * u[a + 1 + S])
    out.y = s0 * (t0 * v[a] + t1 * v[a + S]) + s1 * (t0 * v[a + 1] + t1 * v[a + 1 + S])
  }

  stats(): FluidStats {
    const { u, v, solid, stride: S, ball: b } = this
    let sumSquares = 0
    let count = 0
    for (let j = 1; j <= this.rows; j++) {
      for (let i = 1; i <= this.cols; i++) {
        const k = i + j * S
        if (solid[k]) continue
        const d = 0.5 * (u[k + 1] - u[k - 1] + v[k + S] - v[k - S])
        sumSquares += d * d
        count++
      }
    }
    const relative = Math.hypot(this.inflow - b.vx, b.vy)
    return {
      time: this.frame / 60,
      reynolds: (relative * 2 * b.r) / this.viscosity,
      divergence: Math.sqrt(sumSquares / Math.max(1, count)),
      cols: this.cols,
      rows: this.rows,
    }
  }

  // ---------- Ball ----------

  private updateBall() {
    const b = this.ball
    if (b.held) {
      const nx = this.clampX(b.targetX)
      const ny = this.clampY(b.targetY)
      b.vx = clamp(nx - b.x, -2.5, 2.5)
      b.vy = clamp(ny - b.y, -2.5, 2.5)
      b.x = nx
      b.y = ny
      return
    }
    // Damped spring back to a home point that bobs slightly, which keeps the wake shedding.
    const t = this.frame / 60
    const homeY = b.homeY + Math.sin(t * 0.9) * b.r * 0.25
    b.vx += -0.0025 * (b.x - b.homeX) - 0.05 * b.vx
    b.vy += -0.0025 * (b.y - homeY) - 0.05 * b.vy
    b.x = this.clampX(b.x + b.vx)
    b.y = this.clampY(b.y + b.vy)
  }

  private clampX(x: number) {
    return clamp(x, this.ball.r + 2, this.cols - this.ball.r - 1)
  }

  private clampY(y: number) {
    return clamp(y, this.ball.r + 2, this.rows - this.ball.r - 1)
  }

  private markSolid() {
    const { solid, stride: S, ball: b } = this
    solid.fill(0)
    const i0 = Math.max(1, Math.floor(b.x - b.r))
    const i1 = Math.min(this.cols, Math.ceil(b.x + b.r))
    const j0 = Math.max(1, Math.floor(b.y - b.r))
    const j1 = Math.min(this.rows, Math.ceil(b.y + b.r))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (Math.hypot(i - b.x, j - b.y) <= b.r) solid[i + j * S] = 1
      }
    }

    const { red, black, rim } = this
    let redCount = 0
    let blackCount = 0
    let rimCount = 0
    for (let j = 1; j <= this.rows; j++) {
      for (let i = 1; i <= this.cols; i++) {
        const k = i + j * S
        if (solid[k]) continue
        if (solid[k - 1] | solid[k + 1] | solid[k - S] | solid[k + S]) rim[rimCount++] = k
        else if ((i + j) & 1) black[blackCount++] = k
        else red[redCount++] = k
      }
    }
    this.redCount = redCount
    this.blackCount = blackCount
    this.rimCount = rimCount
  }

  private enforceBall() {
    const { u, v, solid, ball: b } = this
    for (let k = 0; k < solid.length; k++) {
      if (!solid[k]) continue
      u[k] = b.vx
      v[k] = b.vy
    }
  }

  // ---------- Solver pieces ----------

  // MacCormack advection for the dye: advect forward, advect the result backward,
  // and use half the round-trip error as a correction. Limited to the range of the
  // values it was interpolated from, so it can't overshoot. Keeps thin streaks sharp.
  private advectDye() {
    const { cols: W, rows: H, stride: S, solid, u, v, dye, dye0, dyeHat, dyeBack } = this
    dye0.set(dye)
    this.advect(dyeHat, dye0, u, v, 1)
    this.advect(dyeBack, dyeHat, u, v, -1)
    for (let j = 1; j <= H; j++) {
      for (let i = 1; i <= W; i++) {
        const k = i + j * S
        if (solid[k]) {
          dye[k] = 0
          continue
        }
        const x = clamp(i - u[k], 0.5, W + 0.5)
        const y = clamp(j - v[k], 0.5, H + 0.5)
        const a = (x | 0) + (y | 0) * S
        const c0 = dye0[a]
        const c1 = dye0[a + 1]
        const c2 = dye0[a + S]
        const c3 = dye0[a + S + 1]
        const lo = Math.min(c0, c1, c2, c3)
        const hi = Math.max(c0, c1, c2, c3)
        dye[k] = clamp(dyeHat[k] + 0.5 * (dye0[k] - dyeBack[k]), lo, hi)
      }
    }
  }

  private advect(dst: Float64Array, src: Float64Array, uu: Float64Array, vv: Float64Array, direction = 1) {
    const { cols: W, rows: H, stride: S, solid } = this
    for (let j = 1; j <= H; j++) {
      for (let i = 1; i <= W; i++) {
        const k = i + j * S
        if (solid[k]) {
          dst[k] = 0
          continue
        }
        // Trace back along the velocity and sample bilinearly.
        const x = clamp(i - direction * uu[k], 0.5, W + 0.5)
        const y = clamp(j - direction * vv[k], 0.5, H + 0.5)
        const i0 = x | 0
        const j0 = y | 0
        const s1 = x - i0
        const t1 = y - j0
        const s0 = 1 - s1
        const t0 = 1 - t1
        const a = i0 + j0 * S
        dst[k] = s0 * (t0 * src[a] + t1 * src[a + S]) + s1 * (t0 * src[a + 1] + t1 * src[a + 1 + S])
      }
    }
  }

  // Implicit viscosity: solve (I - nu * laplacian) x = x0 with Gauss-Seidel.
  private diffuse(x: Float64Array, x0: Float64Array) {
    // Solid neighbours hold the ball's velocity, which gives a no-slip surface.
    const { stride: S, red, black, rim, redCount, blackCount, rimCount } = this
    const a = this.viscosity
    const inverse = 1 / (1 + 4 * a)
    x0.set(x)
    for (let n = 0; n < VISCOSITY_ITERATIONS; n++) {
      for (let m = 0; m < redCount; m++) {
        const k = red[m]
        x[k] = (x0[k] + a * (x[k - 1] + x[k + 1] + x[k - S] + x[k + S])) * inverse
      }
      for (let m = 0; m < blackCount; m++) {
        const k = black[m]
        x[k] = (x0[k] + a * (x[k - 1] + x[k + 1] + x[k - S] + x[k + S])) * inverse
      }
      for (let m = 0; m < rimCount; m++) {
        const k = rim[m]
        x[k] = (x0[k] + a * (x[k - 1] + x[k + 1] + x[k - S] + x[k + S])) * inverse
      }
    }
  }

  // Solve the pressure Poisson equation, then subtract the pressure gradient.
  private project() {
    const { cols: W, rows: H, stride: S, u, v, p, div, solid } = this

    for (let j = 1; j <= H; j++) {
      for (let i = 1; i <= W; i++) {
        const k = i + j * S
        div[k] = solid[k] ? 0 : -0.5 * (u[k + 1] - u[k - 1] + v[k + S] - v[k - S])
      }
    }

    // Successive over-relaxation; p is kept between frames as a warm start.
    const { red, black, rim, redCount, blackCount, rimCount } = this
    for (let n = 0; n < PRESSURE_ITERATIONS; n++) {
      for (let m = 0; m < redCount; m++) {
        const k = red[m]
        p[k] += SOR * ((div[k] + p[k - 1] + p[k + 1] + p[k - S] + p[k + S]) * 0.25 - p[k])
      }
      for (let m = 0; m < blackCount; m++) {
        const k = black[m]
        p[k] += SOR * ((div[k] + p[k - 1] + p[k + 1] + p[k - S] + p[k + S]) * 0.25 - p[k])
      }
      // Next to the ball the surface is a wall, so dp/dn = 0 there.
      {
        for (let m = 0; m < rimCount; m++) {
          const k = rim[m]
          let sum = 0
          let count = 0
          if (!solid[k - 1]) { sum += p[k - 1]; count++ }
          if (!solid[k + 1]) { sum += p[k + 1]; count++ }
          if (!solid[k - S]) { sum += p[k - S]; count++ }
          if (!solid[k + S]) { sum += p[k + S]; count++ }
          if (count) p[k] += SOR * ((div[k] + sum) / count - p[k])
        }
      }
      this.setPressureBounds()
    }

    for (let j = 1; j <= H; j++) {
      for (let i = 1; i <= W; i++) {
        const k = i + j * S
        if (solid[k]) continue
        const pc = p[k]
        const pl = solid[k - 1] ? pc : p[k - 1]
        const pr = solid[k + 1] ? pc : p[k + 1]
        const pu = solid[k - S] ? pc : p[k - S]
        const pd = solid[k + S] ? pc : p[k + S]
        u[k] -= 0.5 * (pr - pl)
        v[k] -= 0.5 * (pd - pu)
      }
    }
    this.setVelocityBounds()
  }

  private computeCurl() {
    const { cols: W, rows: H, stride: S, u, v, curl } = this
    for (let j = 1; j <= H; j++) {
      for (let i = 1; i <= W; i++) {
        const k = i + j * S
        curl[k] = 0.5 * (v[k + 1] - v[k - 1] - (u[k + S] - u[k - S]))
      }
    }
  }

  // Vorticity confinement puts back small swirls that numerical diffusion smooths away.
  private applyConfinement() {
    const { cols: W, rows: H, stride: S, u, v, curl, solid } = this
    for (let j = 2; j < H; j++) {
      for (let i = 2; i < W; i++) {
        const k = i + j * S
        if (solid[k]) continue
        let nx = 0.5 * (Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]))
        let ny = 0.5 * (Math.abs(curl[k + S]) - Math.abs(curl[k - S]))
        const length = Math.hypot(nx, ny) + 1e-5
        nx /= length
        ny /= length
        const w = curl[k]
        u[k] += CONFINEMENT * ny * w
        v[k] -= CONFINEMENT * nx * w
      }
    }
  }

  private injectDye() {
    const { cols: W, rows: H, stride: S, dye, solid, ball: b } = this
    for (let k = 0; k < dye.length; k++) {
      dye[k] = solid[k] ? 0 : dye[k] * DYE_DECAY
    }
    // Inlet streaks.
    for (let j = 0; j <= H + 1; j++) {
      const value = this.isStreak(j) ? 1 : 0
      dye[j * S] = value
      dye[1 + j * S] = value
    }
    // A thin shell of dye around the ball makes the wake visible.
    const reach = b.r + 1
    const i0 = Math.max(1, Math.floor(b.x - reach))
    const i1 = Math.min(W, Math.ceil(b.x + reach))
    const j0 = Math.max(1, Math.floor(b.y - reach))
    const j1 = Math.min(H, Math.ceil(b.y + reach))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = i + j * S
        if (solid[k]) continue
        const d = Math.hypot(i - b.x, j - b.y)
        if (d <= reach) dye[k] = Math.max(dye[k], 0.4)
      }
    }
  }

  // ---------- Boundaries ----------

  // Left: fixed inflow. Right: open outflow. Top and bottom: free-slip walls.
  private setVelocityBounds() {
    const { cols: W, rows: H, stride: S, u, v } = this
    for (let j = 0; j <= H + 1; j++) {
      const left = j * S
      const right = W + 1 + j * S
      u[left] = this.inflow
      v[left] = 0
      u[right] = u[right - 1]
      v[right] = v[right - 1]
    }
    for (let i = 0; i <= W + 1; i++) {
      const top = i
      const bottom = i + (H + 1) * S
      u[top] = u[top + S]
      v[top] = 0
      u[bottom] = u[bottom - S]
      v[bottom] = 0
    }
  }

  private setPressureBounds() {
    const { cols: W, rows: H, stride: S, p } = this
    for (let j = 0; j <= H + 1; j++) {
      p[j * S] = p[1 + j * S]
      p[W + 1 + j * S] = 0
    }
    for (let i = 0; i <= W + 1; i++) {
      p[i] = p[i + S]
      p[i + (H + 1) * S] = p[i + H * S]
    }
  }
}

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value
}
