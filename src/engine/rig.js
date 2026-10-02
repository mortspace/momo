export const GROUND = -0.92
export const TIP_A = [0, 0.02, 0]
export const TIP_B0 = [0.24, 0.98, -0.04]
export const LIGHT = norm3([-0.55, 0.78, 0.6])
export const CAM = { ro: [0, 0.32, 7.6], ta: [0, 0.12, 0], focal: 2.55 }

export function norm3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
const mix3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
const rot2 = (a, u, v) => {
  const c = Math.cos(a),
    s = Math.sin(a)
  return [c * u + s * v, -s * u + c * v]
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export const M4 = {
  id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul(a, b) {
    const o = new Array(16)
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        o[c * 4 + r] =
          a[r] * b[c * 4] +
          a[4 + r] * b[c * 4 + 1] +
          a[8 + r] * b[c * 4 + 2] +
          a[12 + r] * b[c * 4 + 3]
    return o
  },
  chain(...ms) {
    return ms.reduce((acc, m) => M4.mul(acc, m))
  },
  tr: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
  sc: (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
  plane(i, j, a) {
    const m = M4.id(),
      c = Math.cos(a),
      s = Math.sin(a)
    m[i * 4 + i] = c
    m[j * 4 + i] = s
    m[i * 4 + j] = -s
    m[j * 4 + j] = c
    return m
  },
  basis: (x, y, z, o) => [
    x[0],
    x[1],
    x[2],
    0,
    y[0],
    y[1],
    y[2],
    0,
    z[0],
    z[1],
    z[2],
    0,
    o[0],
    o[1],
    o[2],
    1,
  ],
  lerp: (a, b, t) => a.map((v, i) => v + (b[i] - v) * t),
  inv(m) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m
    const b00 = a00 * a11 - a01 * a10,
      b01 = a00 * a12 - a02 * a10,
      b02 = a00 * a13 - a03 * a10,
      b03 = a01 * a12 - a02 * a11
    const b04 = a01 * a13 - a03 * a11,
      b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30,
      b07 = a20 * a32 - a22 * a30
    const b08 = a20 * a33 - a23 * a30,
      b09 = a21 * a32 - a22 * a31,
      b10 = a21 * a33 - a23 * a31,
      b11 = a22 * a33 - a23 * a32
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
    return [
      (a11 * b11 - a12 * b10 + a13 * b09) * det,
      (a02 * b10 - a01 * b11 - a03 * b09) * det,
      (a31 * b05 - a32 * b04 + a33 * b03) * det,
      (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det,
      (a00 * b11 - a02 * b08 + a03 * b07) * det,
      (a32 * b02 - a30 * b05 - a33 * b01) * det,
      (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det,
      (a01 * b08 - a00 * b10 - a03 * b06) * det,
      (a30 * b04 - a31 * b02 + a33 * b00) * det,
      (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det,
      (a00 * b09 - a01 * b07 + a02 * b06) * det,
      (a31 * b01 - a30 * b03 - a32 * b00) * det,
      (a20 * b03 - a21 * b01 + a22 * b00) * det,
    ]
  },
  normal(m) {
    const i = M4.inv(m)
    return [i[0], i[4], i[8], i[1], i[5], i[9], i[2], i[6], i[10]]
  },
  apply: (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ],
  applyDir: (m, p) => [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2],
  ],
}

export function toObjectM(s) {
  const dead = s.dead || 0,
    squash = s.squash || 0
  const sy = 1 - 0.09 * squash - 0.36 * dead,
    sx = 1 + 0.05 * squash + 0.18 * dead
  const aboutGround = m => M4.chain(M4.tr(0, GROUND, 0), m, M4.tr(0, -GROUND, 0))
  return M4.chain(
    aboutGround(M4.sc(1 / sx, 1 / sy, 1 / sx)),
    aboutGround(M4.plane(0, 1, -0.16 * dead - (s.roll || 0))),
    M4.plane(0, 2, s.yaw || 0),
    M4.tr(0, -(s.lift || 0), 0),
  )
}
export const toRigidM = s => M4.chain(M4.plane(0, 2, s.yaw || 0), M4.tr(0, -(s.lift || 0), 0))

export function tipDir(tip, amt) {
  const d = norm3(sub(TIP_B0, TIP_A))
  const [x, y] = rot2(tip[0] * amt, d[0], d[1])
  d[0] = x
  d[1] = y
  const [y2, z] = rot2(-tip[1] * amt, d[1], d[2])
  d[1] = y2
  d[2] = z
  return d
}
const TIP_LEN = Math.hypot(...sub(TIP_B0, TIP_A))
export const tipMid = tip => add(TIP_A, mul(tipDir(tip, 0.5), TIP_LEN * 0.5 * tip[2]))
export const tipEnd = tip => add(tipMid(tip), mul(tipDir(tip, 1), TIP_LEN * 0.5 * tip[2]))
const crownXY = (crown, tip) => [
  crown[0] + (tipEnd(tip)[0] - TIP_B0[0]) * 0.2,
  crown[1] + (tipEnd(tip)[1] - TIP_B0[1]) * 0.2,
]
const crownTilt = tip => -tip[0] * 0.25

export function partFrame(frame, s, u) {
  const tip = u.uTip
  if (frame === 'hat') {
    const [cx, cy] = crownXY(u.uCrown, tip),
      k = u.uCrown[2]
    return M4.chain(
      M4.tr(cx, cy, 0),
      M4.sc(k, k, k),
      M4.plane(0, 1, -(u.uHatTilt + crownTilt(tip))),
    )
  }
  if (frame === 'helmet') {
    const k = u.uHelmet[2]
    return M4.chain(
      M4.tr(u.uHelmet[0], u.uHelmet[1], 0),
      M4.sc(k, k, k),
      M4.plane(0, 1, -(0.06 + u.uHatTilt * 0.6)),
    )
  }
  if (frame === 'mono') {
    const n = norm3(u.uMonoN)
    const c = add(add(u.uEyeR, [u.uLook[0] - 0.03, u.uLook[1] - 0.05, 0]), mul(n, 0.028))
    const x = norm3(cross([0, 1, 0], n)),
      y = cross(n, x)
    return M4.basis(x, y, n, c)
  }
  if (frame === 'pencil') {
    const dx = norm3(u.uPenD),
      dy = norm3(cross([0, 0, 1], dx)),
      dz = cross(dx, dy)
    const k = u.uSmall ? 0.1 / 0.085 : 1
    return M4.mul(M4.basis(dx, dy, dz, u.uPenC), M4.sc(1, k, k))
  }
  if (frame === 'wear') {
    const k = u.uWear[2]
    return M4.chain(
      M4.tr(u.uWear[0], u.uWear[1], 0),
      M4.sc(k, k, k),
      M4.plane(0, 1, -((WEAR_TILT[s.outfit] || 0) + u.uHatTilt * 0.6)),
    )
  }
  if (frame === 'glasses') return M4.tr(0, -u.uGlassY, 0)
  if (frame === 'snout')
    return M4.chain(
      M4.tr(
        (u.uEyeL[0] + u.uEyeR[0]) / 2 + u.uLook[0] + 0.03,
        (u.uEyeL[1] + u.uEyeR[1]) / 2 + u.uLook[1] - 0.24,
        Math.max(u.uEyeL[2], u.uEyeR[2]),
      ),
      M4.plane(1, 2, 0.12),
    )
  if (frame === 'leaf1' || frame === 'leaf2' || frame === 'stem') {
    const tb = tipEnd(tip),
      perk = u.uLeaf
    if (frame === 'stem') return M4.tr(tb[0], tb[1], tb[2])
    const one = frame === 'leaf1'
    const o = one ? [-0.1, 0.04 + 0.03 * perk, 0] : [0.1, 0.05 + 0.03 * perk, 0.02]
    const a = one ? 0.9 - 0.5 * perk + u.uHatTilt : -0.8 + 0.5 * perk + u.uHatTilt * 1.3
    const c = one ? [-0.13, 0, 0] : [0.14, 0, 0]
    return M4.chain(
      M4.tr(tb[0] + o[0], tb[1] + o[1], tb[2] + o[2]),
      M4.plane(0, 1, -a),
      M4.tr(c[0], c[1], c[2]),
    )
  }
  return M4.id()
}

export function fallWorld(s, u, T) {
  const fall = u.uFall
  if (fall < 0.001) return M4.inv(T)
  const k = smoothstep(0, 0.6, fall)
  const mix = M4.lerp(T, toRigidM(s), k)
  const c = add(mix3(u.uAnchor, u.uLand, fall), [
    0,
    Math.sin(Math.min(1, Math.max(0, fall)) * 3.14159) * (s.outfit === 17 ? 0 : 0.42),
    0,
  ])
  const rfInv = M4.mul(M4.plane(0, 1, -u.uFallRot[0] * fall), M4.plane(1, 2, -u.uFallRot[1] * fall))
  return M4.chain(
    M4.inv(mix),
    M4.tr(c[0], c[1], c[2]),
    rfInv,
    M4.tr(-u.uAnchor[0], -u.uAnchor[1], -u.uAnchor[2]),
  )
}

export function chainPoints(u) {
  const n = norm3(u.uMonoN)
  const c = add(add(u.uEyeR, [u.uLook[0] - 0.03, u.uLook[1] - 0.05, 0]), mul(n, 0.028))
  const x = norm3(cross([0, 1, 0], n)),
    y = cross(n, x)
  const a = add(c, mul(sub(mul(x, 0.707), mul(y, 0.707)), 0.182))
  const b = u.uChainEnd
  const m = add(mix3(a, b, 0.5), [0, -0.13, 0.06])
  const pts = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    pts.push(mix3(mix3(a, m, t), mix3(m, b, t), t))
  }
  return pts
}

export function camera(aspect = 1) {
  const { ro, ta, focal } = CAM
  const ww = norm3(sub(ta, ro)),
    uu = norm3(cross(ww, [0, 1, 0])),
    vv = cross(uu, ww)
  const view = [
    uu[0],
    vv[0],
    -ww[0],
    0,
    uu[1],
    vv[1],
    -ww[1],
    0,
    uu[2],
    vv[2],
    -ww[2],
    0,
    -dot3(uu, ro),
    -dot3(vv, ro),
    dot3(ww, ro),
    1,
  ]
  const n = 4,
    f = 12
  const proj = [
    (2 * focal) / aspect,
    0,
    0,
    0,
    0,
    2 * focal,
    0,
    0,
    0,
    0,
    -(f + n) / (f - n),
    -1,
    0,
    0,
    (-2 * f * n) / (f - n),
    0,
  ]
  return { view, proj, vp: M4.mul(proj, view), ro }
}

export const OUTFIT_OF_VARIANT = {
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
  10: 11,
  11: 12,
  12: 13,
  13: 14,
  14: 15,
  15: 16,
  16: 17,
}
export const NV = Math.max(...Object.keys(OUTFIT_OF_VARIANT).map(Number))
export const WEAR_TILT = {
  9: -0.22,
  10: 0.16,
  11: 0.06,
  12: 0,
  13: 0,
  14: 0,
  15: 0.06,
  16: 0,
  17: 0,
}

export const PARTS = [
  {
    name: 'hat',
    part: 1,
    mat: 2,
    v: 1,
    frame: 'hat',
    lo: [-0.55, -0.05, -0.52],
    hi: [0.55, 0.82, 0.52],
    h: 0.011,
  },
  {
    name: 'mono',
    part: 2,
    mat: 3,
    v: 2,
    frame: 'mono',
    lo: [-0.23, -0.23, -0.035],
    hi: [0.23, 0.23, 0.035],
    h: 0.0045,
    big: true,
  },
  {
    name: 'monoSmall',
    part: 3,
    mat: 3,
    v: 2,
    frame: 'mono',
    lo: [-0.24, -0.24, -0.045],
    hi: [0.24, 0.24, 0.045],
    h: 0.006,
    small: true,
  },
  {
    name: 'penBody',
    part: 4,
    mat: 5,
    v: 3,
    frame: 'pencil',
    lo: [-0.56, -0.115, -0.115],
    hi: [0.52, 0.115, 0.115],
    h: 0.006,
  },
  {
    name: 'penWood',
    part: 5,
    mat: 6,
    v: 3,
    frame: 'pencil',
    lo: [0.44, -0.1, -0.1],
    hi: [0.76, 0.1, 0.1],
    h: 0.005,
  },
  {
    name: 'penFerrule',
    part: 6,
    mat: 8,
    v: 3,
    frame: 'pencil',
    lo: [-0.68, -0.105, -0.105],
    hi: [-0.49, 0.105, 0.105],
    h: 0.005,
  },
  {
    name: 'penEraser',
    part: 7,
    mat: 15,
    v: 3,
    frame: 'pencil',
    lo: [-0.8, -0.11, -0.11],
    hi: [-0.6, 0.11, 0.11],
    h: 0.005,
  },
  {
    name: 'helmet',
    part: 8,
    mat: 10,
    v: 4,
    frame: 'helmet',
    lo: [-0.78, -0.05, -0.74],
    hi: [0.78, 0.53, 0.88],
    h: 0.011,
  },
  {
    name: 'phonesBand',
    part: 9,
    mat: 11,
    v: 5,
    frame: 'identity',
    lo: [-1.2, -0.06, -0.14],
    hi: [1.2, 1.2, 0.06],
    h: 0.01,
  },
  {
    name: 'phonesCups',
    part: 10,
    mat: 11,
    v: 5,
    frame: 'identity',
    lo: [-1.18, -0.32, -0.32],
    hi: [1.18, 0.28, 0.28],
    h: 0.011,
  },
  {
    name: 'phonesPads',
    part: 11,
    mat: 12,
    v: 5,
    frame: 'identity',
    lo: [-1.0, -0.28, -0.28],
    hi: [1.0, 0.24, 0.24],
    h: 0.011,
  },
  { name: 'glasses', part: 12, mat: 13, v: 6, frame: 'glasses', h: 0.0065 },
  {
    name: 'leaf1',
    part: 13,
    mat: 14,
    v: 7,
    frame: 'leaf1',
    lo: [-0.17, -0.065, -0.1],
    hi: [0.17, 0.065, 0.1],
    h: 0.005,
  },
  {
    name: 'leaf2',
    part: 14,
    mat: 14,
    v: 7,
    frame: 'leaf2',
    lo: [-0.18, -0.065, -0.1],
    hi: [0.18, 0.065, 0.1],
    h: 0.005,
  },
  {
    name: 'stem',
    part: 15,
    mat: 14,
    v: 7,
    frame: 'stem',
    lo: [-0.03, -0.06, -0.03],
    hi: [0.03, 0.09, 0.03],
    h: 0.004,
  },
  {
    name: 'beret',
    part: 16,
    mat: 16,
    v: 8,
    frame: 'wear',
    lo: [-0.8, -0.2, -0.88],
    hi: [1.08, 0.66, 0.88],
    h: 0.01,
  },
  {
    name: 'clapBoard',
    part: 17,
    mat: 17,
    v: 9,
    frame: 'wear',
    lo: [-0.48, -0.02, -0.07],
    hi: [0.48, 0.52, 0.07],
    h: 0.007,
  },
  {
    name: 'clapSticks',
    part: 18,
    mat: 18,
    v: 9,
    frame: 'wear',
    lo: [-0.54, 0.42, -0.08],
    hi: [0.5, 1.06, 0.08],
    h: 0.006,
  },
  {
    name: 'sweatband',
    part: 19,
    mat: 19,
    v: 10,
    frame: 'wear',
    lo: [-1.12, -0.17, -1.04],
    hi: [1.12, 0.17, 1.04],
    h: 0.008,
  },
  {
    name: 'gogStrap',
    part: 20,
    mat: 20,
    v: 11,
    frame: 'wear',
    lo: [-0.9, -0.1, -0.84],
    hi: [0.9, 0.14, 0.84],
    h: 0.006,
  },
  {
    name: 'gogCups',
    part: 21,
    mat: 21,
    v: 11,
    frame: 'wear',
    lo: [-0.56, -0.22, 0.4],
    hi: [0.56, 0.36, 0.88],
    h: 0.005,
  },
  {
    name: 'gogLens',
    part: 22,
    mat: 22,
    v: 11,
    frame: 'wear',
    lo: [-0.5, -0.14, 0.5],
    hi: [0.5, 0.32, 0.86],
    h: 0.005,
  },
  {
    name: 'gogLeather',
    part: 27,
    mat: 26,
    v: 11,
    frame: 'wear',
    lo: [-0.56, -0.22, 0.36],
    hi: [0.56, 0.36, 0.86],
    h: 0.005,
  },
  {
    name: 'snout',
    part: 23,
    mat: 23,
    v: 12,
    frame: 'snout',
    lo: [-0.25, -0.2, -0.11],
    hi: [0.25, 0.2, 0.15],
    h: 0.005,
  },
  {
    name: 'pigEars',
    part: 28,
    mat: 43,
    v: 12,
    frame: 'wear',
    lo: [-0.86, -0.44, -0.12],
    hi: [0.86, 0.22, 0.38],
    h: 0.006,
  },
  {
    name: 'pigCoin',
    part: 29,
    mat: 44,
    v: 12,
    frame: 'wear',
    lo: [-0.2, -0.18, -0.06],
    hi: [0.3, 0.32, 0.06],
    h: 0.004,
  },
  {
    name: 'setBand',
    part: 24,
    mat: 24,
    v: 13,
    frame: 'wear',
    lo: [-1.2, -0.32, -0.3],
    hi: [1.2, 1.18, 0.28],
    h: 0.009,
  },
  {
    name: 'setBoom',
    part: 25,
    mat: 24,
    v: 13,
    frame: 'wear',
    lo: [-1.1, -0.5, 0.0],
    hi: [-0.36, -0.06, 0.94],
    h: 0.005,
  },
  {
    name: 'setFoam',
    part: 26,
    mat: 25,
    v: 13,
    frame: 'wear',
    lo: [-0.46, -0.48, 0.8],
    hi: [-0.28, -0.3, 0.98],
    h: 0.005,
  },
  {
    name: 'skipBand',
    part: 30,
    mat: 46,
    v: 14,
    frame: 'wear',
    lo: [-0.78, -0.05, -0.74],
    hi: [0.78, 0.31, 0.74],
    h: 0.008,
  },
  {
    name: 'skipTop',
    part: 31,
    mat: 45,
    v: 14,
    frame: 'wear',
    lo: [-0.92, 0.12, -0.9],
    hi: [0.92, 0.66, 0.84],
    h: 0.009,
  },
  {
    name: 'skipPeak',
    part: 32,
    mat: 47,
    v: 14,
    frame: 'wear',
    lo: [-0.62, -0.2, 0.44],
    hi: [0.62, 0.12, 1.08],
    h: 0.005,
  },
  {
    name: 'skipBadge',
    part: 33,
    mat: 48,
    v: 14,
    frame: 'wear',
    lo: [-0.13, 0.05, 0.64],
    hi: [0.13, 0.29, 0.78],
    h: 0.004,
  },
  {
    name: 'skipBraid',
    part: 40,
    mat: 48,
    v: 14,
    frame: 'wear',
    lo: [-0.76, 0.0, 0.3],
    hi: [0.76, 0.13, 0.72],
    h: 0.004,
  },
  {
    name: 'mirBand',
    part: 34,
    mat: 49,
    v: 15,
    frame: 'wear',
    lo: [-1.12, -0.11, -1.04],
    hi: [1.12, 0.2, 1.04],
    h: 0.008,
  },
  {
    name: 'mirDisc',
    part: 35,
    mat: 50,
    v: 15,
    frame: 'wear',
    lo: [-0.26, -0.11, 0.68],
    hi: [0.3, 0.43, 1.0],
    h: 0.0045,
  },
  {
    name: 'mirRim',
    part: 36,
    mat: 51,
    v: 15,
    frame: 'wear',
    lo: [-0.29, -0.14, 0.66],
    hi: [0.33, 0.46, 1.02],
    h: 0.0045,
  },
  {
    name: 'signPole',
    part: 37,
    mat: 52,
    v: 16,
    frame: 'wear',
    lo: [0.49, -0.96, -0.63],
    hi: [0.8, 1.04, -0.4],
    h: 0.005,
  },
  {
    name: 'signPlate',
    part: 38,
    mat: 53,
    v: 16,
    frame: 'wear',
    lo: [0.39, 0.72, -0.5],
    hi: [1.09, 1.44, -0.4],
    h: 0.005,
  },
  {
    name: 'signMark',
    part: 39,
    mat: 54,
    v: 16,
    frame: 'wear',
    lo: [0.45, 0.78, -0.47],
    hi: [1.03, 1.38, -0.39],
    h: 0.004,
  },
]
export const BODY_BOUNDS = { lo: [-1.04, -0.98, -0.96], hi: [1.04, 1.12, 0.96] }
