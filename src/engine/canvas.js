import { uniformsFor, variantOf, PALETTES, OUTFITS, FACE, hexToRgb, SHADOW } from './character.js'
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js'
import {
  toObjectM,
  partFrame,
  fallWorld,
  chainPoints,
  camera,
  tipMid,
  tipEnd,
  M4,
  GROUND,
  LIGHT,
  TIP_A,
  TIP_B0,
  NV,
  BUG_SPOTS,
  BUG_SEAM,
  partHidden,
} from './rig.js'

export { PALETTES, OUTFITS, FACE, hexToRgb }

const VARS = Array.from({ length: NV }, (_, i) => i + 1)
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x)
const mix = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1)
  return b + (a - b) * h - k * h * (1 - h)
}
const smax = (a, b, k) => -smin(-a, -b, k)
function sdEll(x, y, z, rx, ry, rz) {
  const k0 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2)
  const k1 = Math.sqrt((x / (rx * rx)) ** 2 + (y / (ry * ry)) ** 2 + (z / (rz * rz)) ** 2)
  return (k0 * (k0 - 1)) / k1
}
function sdRoundCone(px, py, pz, a, b, r1, r2) {
  const bax = b[0] - a[0],
    bay = b[1] - a[1],
    baz = b[2] - a[2]
  const l2 = bax * bax + bay * bay + baz * baz,
    rr = r1 - r2,
    a2 = l2 - rr * rr,
    il2 = 1 / l2
  const pax = px - a[0],
    pay = py - a[1],
    paz = pz - a[2]
  const y = pax * bax + pay * bay + paz * baz,
    z = y - l2
  const xvx = pax * l2 - bax * y,
    xvy = pay * l2 - bay * y,
    xvz = paz * l2 - baz * y
  const x2 = xvx * xvx + xvy * xvy + xvz * xvz,
    y2 = y * y * l2,
    z2 = z * z * l2
  const k = Math.sign(rr) * rr * rr * x2
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
}
const TIP_LEN = Math.hypot(TIP_B0[0] - TIP_A[0], TIP_B0[1] - TIP_A[1], TIP_B0[2] - TIP_A[2])
const D0 = [
  (TIP_B0[0] - TIP_A[0]) / TIP_LEN,
  (TIP_B0[1] - TIP_A[1]) / TIP_LEN,
  (TIP_B0[2] - TIP_A[2]) / TIP_LEN,
]
const TM0 = [
  TIP_A[0] + D0[0] * TIP_LEN * 0.5,
  TIP_A[1] + D0[1] * TIP_LEN * 0.5,
  TIP_A[2] + D0[2] * TIP_LEN * 0.5,
]

function bodyD(x, y, z, tm, tb) {
  const tip = smin(
    sdRoundCone(x, y, z, TIP_A, tm, 0.6, 0.31),
    sdRoundCone(x, y, z, tm, tb, 0.31, 0.085),
    0.05,
  )
  return smax(smin(sdEll(x, y + 0.2, z, 0.98, 0.74, 0.9), tip, 0.36), -(y - GROUND), 0.16)
}
function tipRot(v, tip, amt) {
  let c = Math.cos(tip[0] * amt),
    s = Math.sin(tip[0] * amt)
  let x = c * v[0] + s * v[1],
    y = -s * v[0] + c * v[1],
    z = v[2]
  c = Math.cos(-tip[1] * amt)
  s = Math.sin(-tip[1] * amt)
  return [x, c * y + s * z, -s * y + c * z]
}
function bendWeight(x, y, z) {
  const e = sdEll(x, y + 0.2, z, 0.98, 0.74, 0.9)
  const t = smin(
    sdRoundCone(x, y, z, TIP_A, TM0, 0.6, 0.31),
    sdRoundCone(x, y, z, TM0, TIP_B0, 0.31, 0.085),
    0.05,
  )
  return 1 - clamp(0.5 + (0.5 * (t - e)) / 0.36, 0, 1)
}
function bend(x, y, z, w, tip, tm) {
  const rx = x - TIP_A[0],
    ry = y - TIP_A[1],
    rz = z - TIP_A[2]
  const al = rx * D0[0] + ry * D0[1] + rz * D0[2]
  const px = rx - al * D0[0],
    py = ry - al * D0[1],
    pz = rz - al * D0[2]
  const v1 = tipRot(
    [D0[0] * al * tip[2] + px, D0[1] * al * tip[2] + py, D0[2] * al * tip[2] + pz],
    tip,
    0.5,
  )
  const a2 = al - TIP_LEN * 0.5
  const v2 = tipRot(
    [D0[0] * a2 * tip[2] + px, D0[1] * a2 * tip[2] + py, D0[2] * a2 * tip[2] + pz],
    tip,
    1,
  )
  const k = smooth(0.4, 0.6, al / TIP_LEN)
  const bx = mix(TIP_A[0] + v1[0], tm[0] + v2[0], k),
    by = mix(TIP_A[1] + v1[1], tm[1] + v2[1], k),
    bz = mix(TIP_A[2] + v1[2], tm[2] + v2[2], k)
  return [mix(x, bx, w), mix(y, by, w), mix(z, bz, w)]
}

const L = LIGHT
const F = (() => {
  const v = [0.8, 0.15, 0.55],
    l = Math.hypot(...v)
  return v.map(c => c / l)
})()
function ramp(t, a, b, c, d, out) {
  let p, q, k
  if (t < 0.4) {
    p = a
    q = b
    k = smooth(0, 0.4, t)
  } else if (t < 0.72) {
    p = b
    q = c
    k = smooth(0.4, 0.72, t)
  } else {
    p = c
    q = d
    k = smooth(0.72, 1, t)
  }
  out[0] = mix(p[0], q[0], k)
  out[1] = mix(p[1], q[1], k)
  out[2] = mix(p[2], q[2], k)
}
const envY = ry => [
  mix(0.62, 1, smooth(-0.4, 0.8, ry)),
  mix(0.58, 0.99, smooth(-0.4, 0.8, ry)),
  mix(0.55, 0.97, smooth(-0.4, 0.8, ry)),
]
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
const wrapOf = (nl, k) => clamp((nl + k) / (1 + k), 0, 1)
function wearQ(q, tilt, u) {
  let x = (q[0] - u.uWear[0]) / u.uWear[2],
    y = (q[1] - u.uWear[1]) / u.uWear[2],
    z = q[2] / u.uWear[2]
  const a = tilt + u.uHatTilt * 0.6,
    c = Math.cos(a),
    s = Math.sin(a)
  return [c * x + s * y, -s * x + c * y, z]
}
function clapArm(w) {
  let x = w[0] + 0.42,
    y = w[1] - 0.53
  const c = Math.cos(0.42),
    s = Math.sin(0.42)
  return [c * x + s * y - 0.42, -s * x + c * y - 0.05, w[2]]
}

function hatFold(x, y, z) {
  return (
    Math.cos(Math.atan2(z, x) * 8 + 0.6) *
    smooth(0.04, 0.3, Math.hypot(x, z)) *
    smooth(0.3, 0.42, y)
  )
}
const HAT_DARK = [0.8, 0.8, 0.88],
  HAT_LIT = [1, 0.995, 0.985]
function chefHat(lp, w, fres, nh) {
  const x = lp[0],
    y = lp[1],
    z = lp[2],
    r = Math.hypot(x, z)
  let k = 1 - 0.1 * smooth(-0.2, -0.9, hatFold(x, y, z))
  k *= 1 - 0.22 * smooth(0.16, 0.3, y) * (1 - smooth(0.3, 0.36, y)) * (1 - smooth(0.37, 0.41, r))
  if (y > 0.6) k *= 1 - 0.1 * (1 - smooth(0.02, 0.1, r))
  return [
    add3(
      add3(mul3(mix3(HAT_DARK, HAT_LIT, w), k), [0.85, 0.88, 1], fres * 0.1),
      [1, 1, 1],
      Math.pow(nh, 18) * 0.05,
    ),
  ]
}
function dollar(fx, fy, s) {
  fx /= s
  fy /= s
  let s1 = Math.abs(Math.hypot(fx, fy - 0.07) - 0.07) - 0.024
  if (fx > 0 && fy < 0.07) s1 = 1
  let s2 = Math.abs(Math.hypot(fx, fy + 0.07) - 0.07) - 0.024
  if (fx < 0 && fy > -0.07) s2 = 1
  return Math.min(s1, s2, Math.max(Math.abs(fx) - 0.018, Math.abs(fy) - 0.2)) * s
}
const COIN_C = Math.cos(0.18),
  COIN_S = Math.sin(0.18)
function pigBody(nl, fres, nh, u) {
  const t = Math.pow(wrapOf(nl, 0.35), 1.15),
    c = [0, 0, 0]
  ramp(t, u.cDeep, u.cShade, u.cBase, u.cLight, c)
  return add3(
    add3(c, mix3(u.cLight, [1, 1, 1], 0.3), fres * 0.25),
    [1, 1, 1],
    Math.pow(nh, 16) * 0.08,
  )
}

function propColors(mat, N, V, q, u, lp) {
  const nl = N[0] * L[0] + N[1] * L[1] + N[2] * L[2]
  const nv = Math.max(N[0] * V[0] + N[1] * V[1] + N[2] * V[2], 0)
  const hx = L[0] + V[0],
    hy = L[1] + V[1],
    hz = L[2] + V[2],
    hl = Math.hypot(hx, hy, hz)
  const nh = Math.max((N[0] * hx + N[1] * hy + N[2] * hz) / hl, 0)
  const fres = Math.pow(1 - nv, 2.4)
  const rd = [-V[0], -V[1], -V[2]],
    dn = 2 * (N[0] * rd[0] + N[1] * rd[1] + N[2] * rd[2])
  const R = [rd[0] - dn * N[0], rd[1] - dn * N[1], rd[2] - dn * N[2]]
  const rl = Math.max(R[0] * L[0] + R[1] * L[1] + R[2] * L[2], 0)
  if (mat === 2)
    return u.uSmall > 0.5
      ? [add3(mix3(HAT_DARK, HAT_LIT, wrapOf(nl, 0.45)), [0.85, 0.88, 1], fres * 0.1)]
      : chefHat(lp, wrapOf(nl, 0.45), fres, nh)
  if (mat === 23) {
    const b = add3(
      mix3(pigBody(nl, fres, nh, u), mul3(u.cLight, 1.04), 0.45),
      [1, 1, 1],
      0.009 + Math.pow(nh, 40) * 0.25,
    )
    return [b, mix3(u.cDeep, [0.45, 0.14, 0.24], 0.55)]
  }
  if (mat === 43)
    return [
      mul3(pigBody(nl, fres, nh, u), mix(1, 0.9, smooth(0.2, 0.8, N[1] * 0.196 + N[2] * 0.98))),
    ]
  if (mat === 44) {
    const c = add3(
      add3(
        mix3(
          mix3([0.62, 0.4, 0.08], [1, 0.85, 0.38], wrapOf(nl, 0.35)),
          [1, 0.95, 0.72],
          smooth(0.55, 1, R[1]) * 0.3,
        ),
        [1, 0.95, 0.8],
        Math.pow(rl, 40) * 0.9,
      ),
      [1, 0.9, 0.6],
      fres * 0.25,
    )
    return [c, mul3(c, 0.66)]
  }
  if (mat === 3) {
    let c = mix3([0.86, 0.6, 0.2], [1, 0.86, 0.46], wrapOf(nl, 0.3))
    c = mix3(c, [1, 0.95, 0.78], smooth(0.55, 1, R[1]) * 0.35)
    return [add3(add3(c, [1, 0.97, 0.88], Math.pow(rl, 40) * 0.8), [1, 0.9, 0.6], fres * 0.25)]
  }
  if (mat === 5) {
    const w = wrapOf(nl, 0.35)
    return [add3(mix3([0.86, 0.55, 0.12], [1, 0.86, 0.36], w), [1, 1, 1], Math.pow(nh, 40) * 0.35)]
  }
  if (mat === 6) {
    const w = wrapOf(nl, 0.35)
    const lead = add3(
      mix3([0.1, 0.1, 0.12], [0.42, 0.42, 0.48], w),
      [1, 1, 1],
      Math.pow(nh, 50) * 0.5,
    )
    return [
      mix3([0.86, 0.55, 0.12], [1, 0.86, 0.36], w),
      mix3([0.72, 0.52, 0.32], [0.98, 0.86, 0.66], w),
      lead,
    ]
  }
  if (mat === 8) {
    const e = envY(R[1])
    return [
      add3(mul3([0.78 * e[0], 0.8 * e[1], 0.86 * e[2]], 0.92), [1, 1, 1], Math.pow(rl, 24) * 0.6),
    ]
  }
  if (mat === 10) {
    const w = wrapOf(nl, 0.3)
    return [
      add3(
        add3(mix3([0.93, 0.62, 0.08], [1, 0.85, 0.25], w), [1, 1, 1], Math.pow(rl, 60) * 0.7),
        [1, 0.95, 0.8],
        fres * 0.2,
      ),
    ]
  }
  if (mat === 11) {
    const w = wrapOf(nl, 0.35)
    return [
      add3(
        add3(mix3([0.12, 0.12, 0.15], [0.34, 0.34, 0.4], w), [1, 1, 1], Math.pow(nh, 30) * 0.18),
        [0.7, 0.72, 0.8],
        fres * 0.2,
      ),
    ]
  }
  if (mat === 12) return [mix3([0.62, 0.62, 0.68], [0.93, 0.93, 0.96], wrapOf(nl, 0.4))]
  if (mat === 13) {
    const k = Math.pow(rl, 50) * 0.8 + 0.15 * fres
    return [[0.1 + k, 0.08 + k, 0.09 + k]]
  }
  if (mat === 14) {
    const w = wrapOf(nl, 0.35)
    return [add3(mix3([0.2, 0.5, 0.2], [0.55, 0.85, 0.4], w), [0.8, 1, 0.7], fres * 0.25)]
  }
  if (mat === 16) {
    const w = wrapOf(nl, 0.35)
    return [
      add3(
        add3(mix3([0.07, 0.07, 0.09], [0.27, 0.26, 0.31], w), [0.78, 0.74, 0.88], fres * 0.3),
        [1, 1, 1],
        Math.pow(nh, 22) * 0.1,
      ),
    ]
  }
  if (mat === 17 || mat === 18) {
    const w = wrapOf(nl, 0.35),
      sp = Math.pow(rl, 40) * 0.35
    const ink = add3(mix3([0.05, 0.05, 0.07], [0.2, 0.2, 0.24], w), [1, 1, 1], sp)
    const chalk = add3(mix3([0.8, 0.8, 0.84], [1, 1, 1], w), [1, 1, 1], sp)
    return mat === 18 ? [ink, chalk] : [ink, mix3(ink, mul3(chalk, 0.85), 0.85)]
  }
  if (mat === 19) {
    const w = wrapOf(nl, 0.4)
    return [
      add3(mix3([0.84, 0.84, 0.88], [1, 1, 1], w), [1, 1, 1], fres * 0.12),
      mul3(u.cDeep, mix(0.85, 1.1, w)),
    ]
  }
  if (mat === 20 || mat === 26) {
    const w = wrapOf(nl, 0.35),
      cup = mat === 26
    const c = cup
      ? mix3([0.14, 0.08, 0.05], [0.4, 0.25, 0.15], w)
      : mix3([0.34, 0.2, 0.1], [0.7, 0.46, 0.27], w)
    return [add3(c, [1, 0.85, 0.7], Math.pow(nh, 24) * (cup ? 0.2 : 0.14))]
  }
  if (mat === 21) {
    const c = mix3(
      mix3([0.55, 0.36, 0.12], [0.98, 0.82, 0.46], wrapOf(nl, 0.3)),
      [1, 0.95, 0.8],
      smooth(0.5, 1, R[1]) * 0.3,
    )
    return [add3(add3(c, [1, 0.95, 0.8], Math.pow(rl, 50) * 0.9), [1, 0.9, 0.6], fres * 0.25)]
  }
  if (mat === 22) {
    const c = mix3(
      mix3([0.08, 0.18, 0.26], [0.42, 0.66, 0.82], smooth(-0.3, 0.9, R[1])),
      [0.96, 0.98, 1],
      smooth(0.82, 0.98, R[1]) * 0.6,
    )
    return [add3(add3(c, [1, 1, 1], Math.pow(rl, 90) * 1.2), [0.6, 0.85, 1], fres * 0.45)]
  }
  if (mat === 23) {
    const w = wrapOf(nl, 0.4)
    return [
      add3(
        add3(mix3([0.08, 0.42, 0.26], [0.3, 0.74, 0.46], w), [0.7, 1, 0.8], fres * 0.3),
        [1, 1, 1],
        Math.pow(rl, 50) * 0.5,
      ),
    ]
  }
  if (mat === 24) {
    const w = wrapOf(nl, 0.4)
    return [add3(mix3([0.1, 0.15, 0.3], [0.3, 0.42, 0.64], w), [1, 1, 1], Math.pow(rl, 40) * 0.35)]
  }
  if (mat === 25) return [mix3([0.08, 0.08, 0.1], [0.26, 0.26, 0.3], wrapOf(nl, 0.35))]
  if (mat === 45)
    return [
      add3(
        mix3([0.8, 0.81, 0.87], [1, 0.995, 0.985], wrapOf(nl, 0.45)),
        [0.85, 0.88, 1],
        fres * 0.1,
      ),
    ]
  if (mat === 46 || mat === 47) {
    const w = wrapOf(nl, 0.4),
      peak = mat === 47
    const c = peak
      ? mix3([0.02, 0.03, 0.07], [0.12, 0.15, 0.26], w)
      : mix3([0.05, 0.08, 0.2], [0.2, 0.28, 0.5], w)
    return [
      add3(
        add3(c, [1, 1, 1], Math.pow(rl, peak ? 60 : 24) * (peak ? 0.8 : 0.15)),
        [0.6, 0.7, 1],
        fres * (peak ? 0.3 : 0.12),
      ),
    ]
  }
  if (mat === 48) {
    let c = mix3([0.86, 0.6, 0.2], [1, 0.86, 0.46], wrapOf(nl, 0.3))
    c = mix3(c, [1, 0.95, 0.78], smooth(0.55, 1, R[1]) * 0.35)
    return [add3(add3(c, [1, 0.97, 0.88], Math.pow(rl, 40) * 0.8), [1, 0.9, 0.6], fres * 0.25)]
  }
  if (mat === 49)
    return [
      add3(
        mix3([0.08, 0.08, 0.1], [0.28, 0.28, 0.32], wrapOf(nl, 0.35)),
        [1, 1, 1],
        Math.pow(nh, 30) * 0.12,
      ),
    ]
  if (mat === 50 || mat === 51) {
    const w = wrapOf(nl, 0.45)
    const c =
      mat === 51
        ? mix3([0.5, 0.53, 0.6], [0.78, 0.8, 0.86], w)
        : mix3([0.74, 0.78, 0.86], [0.97, 0.98, 1], w)
    return [add3(add3(c, [1, 1, 1], Math.pow(nh, 26) * 0.14), [0.85, 0.9, 1], fres * 0.1)]
  }
  if (mat === 52 || mat === 54) {
    const w = wrapOf(nl, 0.4),
      white = mat === 54
    return [
      add3(
        white
          ? mix3([0.84, 0.84, 0.87], [1, 1, 1], w)
          : mix3([0.46, 0.48, 0.53], [0.88, 0.89, 0.93], w),
        [1, 1, 1],
        Math.pow(rl, 40) * (white ? 0.2 : 0.6),
      ),
    ]
  }
  if (mat === 55 || mat === 56)
    return [
      add3(
        add3(
          add3(
            mix3([0.05, 0.045, 0.06], [0.25, 0.22, 0.25], wrapOf(nl, 0.35)),
            [1, 1, 1],
            0.06 * u.uDarkFloor,
          ),
          [1, 1, 1],
          Math.pow(nh, 36) * 0.22,
        ),
        [0.8, 0.8, 0.9],
        fres * (0.12 + 0.4 * u.uDarkFloor),
      ),
    ]
  if (mat === 53)
    return [
      add3(
        add3(
          mix3([0.6, 0.04, 0.06], [0.96, 0.2, 0.17], wrapOf(nl, 0.35)),
          [1, 0.85, 0.85],
          Math.pow(rl, 50) * 0.45,
        ),
        [1, 0.6, 0.6],
        fres * 0.15,
      ),
    ]
  return [mix3([0.82, 0.42, 0.52], [1, 0.72, 0.78], wrapOf(nl, 0.4))]
}
const SATIN = [1, 0.93, 0.9]
const PAT = [0, 1],
  pat = (a, b) => {
    PAT[0] = a
    PAT[1] = b
    return PAT
  }
function propPattern(mat, q, u) {
  if (mat === 23) {
    const nos =
      Math.min(
        Math.hypot((q[0] + 0.048) / 0.024, q[1] / 0.036),
        Math.hypot((q[0] - 0.048) / 0.024, q[1] / 0.036),
      ) - 1
    return pat(nos < 0 && q[2] > 0.05 ? 1 : 0, 1)
  }
  if (mat === 44) {
    const x = q[0] - 0.05,
      y = q[1] - 0.07,
      cx = COIN_C * x + COIN_S * y,
      cy = -COIN_S * x + COIN_C * y,
      face = Math.abs(q[2]) > 0.012
    if (!face)
      return pat(
        0,
        0.82 +
          0.18 * (Math.atan2(cy, cx) * 7.64 - Math.floor(Math.atan2(cy, cx) * 7.64) < 0.5 ? 0 : 1),
      )
    const mark = Math.min(
      Math.abs(Math.hypot(cx, cy) - 0.15) - 0.011,
      dollar(cx * Math.sign(q[2] + 1e-4), cy, 0.62),
    )
    return pat(mark < 0.0035 ? 1 : 0, 1)
  }
  if (mat === 18) {
    const w = wearQ(q, 0.16, u)
    const a = w[1] > 0.58 ? clapArm(w) : [w[0], w[1] - 0.53, w[2]]
    const f = (a[0] + a[1] * 0.9) * 3.2 + 0.25
    return pat(f - Math.floor(f) < 0.5 ? 1 : 0, 1)
  }
  if (mat === 17) {
    const w = wearQ(q, 0.16, u)
    return pat(
      w[2] > 0.02 &&
        (Math.abs(w[1] - 0.33) < 0.012 || Math.abs(w[1] - 0.2) < 0.012) &&
        Math.abs(w[0]) < 0.34
        ? 1
        : 0,
      1,
    )
  }
  if (mat === 19) {
    const w = wearQ(q, 0.06, u)
    return pat(
      smooth(0.046, 0.039, Math.abs(w[1] - 0.01)),
      0.94 + 0.06 * Math.cos(Math.atan2(w[2], w[0]) * 140),
    )
  }
  if (mat === 6) {
    const dxl = Math.hypot(...u.uPenD),
      dx = u.uPenD.map(v => v / dxl)
    const r = [q[0] - u.uPenC[0], q[1] - u.uPenC[1], q[2] - u.uPenC[2]]
    const along = r[0] * dx[0] + r[1] * dx[1] + r[2] * dx[2]
    let dy = [-dx[1], dx[0], 0]
    const l = Math.hypot(...dy)
    dy = dy.map(v => v / l)
    const dz = [
      dx[1] * dy[2] - dx[2] * dy[1],
      dx[2] * dy[0] - dx[0] * dy[2],
      dx[0] * dy[1] - dx[1] * dy[0],
    ]
    const ang = Math.atan2(
      r[0] * dz[0] + r[1] * dz[1] + r[2] * dz[2],
      r[0] * dy[0] + r[1] * dy[1] + r[2] * dy[2],
    )
    return pat(along > 0.67 ? 2 : along < 0.5 + 0.018 * Math.cos(ang * 6) ? 0 : 1, 1)
  }
  return null
}
const PATTERNED = new Set([6, 17, 18, 19, 23, 44])
const LOCAL_Q = new Set([23, 44])
function disc(x, y, z, r, h) {
  const a = x - r,
    b = Math.abs(y) - h
  return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0))
}
const HAT_OCC = {
  1: [
    'hat',
    (x, y, z) =>
      Math.min(
        Math.max(Math.hypot(x, z) - 0.36, Math.abs(y - 0.15) - 0.15),
        sdEll(x - 0.02, y - 0.5, z, 0.47, 0.25, 0.45),
      ),
  ],
  4: [
    'helmet',
    (x, y, z) =>
      Math.min(
        Math.max(sdEll(x, y, z, 0.62, 0.47, 0.6), -y),
        disc(Math.hypot(x, (z - 0.07) * 0.94), y - 0.012, 0, 0.72, 0.026),
      ),
  ],
  8: ['wear', (x, y, z) => sdEll(x - 0.14, y - 0.2, z, 0.86, 0.24, 0.8)],
  14: ['wear', (x, y, z) => sdEll(x, y - 0.22, z + 0.02, 0.84, 0.26, 0.78)],
}

function taper(ctx, pts, w0, w1, mode) {
  const n = pts.length
  if (n < 2) return
  const left = [],
    right = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const w =
      mode === 'arc'
        ? w0 * mix(0.4, 1, Math.sin(t * Math.PI))
        : mode === 'brow'
          ? w0 * mix(0.55, 1, Math.sin(t * Math.PI))
          : mix(w0, w1, t)
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n - 1, i + 1)]
    let tx = b[0] - a[0],
      ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    tx /= l
    ty /= l
    left.push([pts[i][0] - ty * w, pts[i][1] + tx * w])
    right.push([pts[i][0] + ty * w, pts[i][1] - tx * w])
  }
  ctx.beginPath()
  ctx.moveTo(left[0][0], left[0][1])
  for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1])
  const we = Math.hypot(left[n - 1][0] - right[n - 1][0], left[n - 1][1] - right[n - 1][1]) / 2
  ctx.arc(
    pts[n - 1][0],
    pts[n - 1][1],
    we,
    Math.atan2(left[n - 1][1] - pts[n - 1][1], left[n - 1][0] - pts[n - 1][0]),
    Math.atan2(right[n - 1][1] - pts[n - 1][1], right[n - 1][0] - pts[n - 1][0]),
    true,
  )
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
  const ws = Math.hypot(left[0][0] - right[0][0], left[0][1] - right[0][1]) / 2
  ctx.arc(
    pts[0][0],
    pts[0][1],
    ws,
    Math.atan2(right[0][1] - pts[0][1], right[0][0] - pts[0][0]),
    Math.atan2(left[0][1] - pts[0][1], left[0][0] - pts[0][0]),
    true,
  )
  ctx.closePath()
  ctx.fill()
}
const arcPts = (c, r, a0, a1, n = 24) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = mix(a0, a1, i / n)
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]
  })
const INK = 'rgb(11,11,15)'
const rgbStr = (c, a = 1) =>
  `rgba(${Math.round(clamp(c[0], 0, 1) * 255)},${Math.round(clamp(c[1], 0, 1) * 255)},${Math.round(clamp(c[2], 0, 1) * 255)},${a})`

function drawFace(ctx, u) {
  const small = u.uSmall > 0.5
  const lw = Math.max(small ? 0.034 : 0.022, u.uPixW * 1.25)
  const look = u.uLook
  const Lc = [u.uEyeL[0] + look[0], u.uEyeL[1] + look[1]],
    Rc = [u.uEyeR[0] + look[0], u.uEyeR[1] + look[1]]
  const rx = u.uEyeRX * u.uEyeScale[0]
  const by = u.uEyeRY + 0.03
  const bl = [u.uEyeL[0] + look[0] * 0.6 + 0.02, u.uEyeL[1] + look[1] * 0.6 + by],
    br = [u.uEyeR[0] + look[0] * 0.6 - 0.02, u.uEyeR[1] + look[1] * 0.6 + by]
  const eL0 = [Lc[0] + 0.03, Lc[1] - 0.07],
    eR0 = [Rc[0] - 0.03, Rc[1] - 0.07]
  const cheekL = [eL0[0] - 0.09, eL0[1] - 0.173],
    cheekR = [eR0[0] + 0.09, eR0[1] - 0.173]
  const mid = [(eL0[0] + eR0[0]) / 2, (eL0[1] + eR0[1]) / 2]
  const refl = [0.4, 0.53, 0.82]
  const off = p => [p[0], p[1]]
  const cheek = (c, s) => {
    if (small) return
    ctx.save()
    ctx.translate(c[0], c[1])
    ctx.scale(0.11 / s, 0.065 / s)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, 'rgba(255,140,153,0.28)')
    g.addColorStop(0.25, 'rgba(255,140,153,0.28)')
    g.addColorStop(0.62, 'rgba(255,140,153,0.14)')
    g.addColorStop(1, 'rgba(255,140,153,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const brow = (c, a, b, w = lw) => {
    if (small || u.uBrowOn <= 0) return
    const s0 = [c[0] - 0.058, c[1] + a],
      s1 = [c[0] + 0.058, c[1] + b],
      m = [(s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2 + 0.014]
    const pts = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12
      return [
        mix(mix(s0[0], m[0], t), mix(m[0], s1[0], t), t),
        mix(mix(s0[1], m[1], t), mix(m[1], s1[1], t), t),
      ]
    })
    ctx.fillStyle = `rgba(11,11,15,${0.7 * u.uBrowOn})`
    taper(ctx, pts, w * 0.64, 0, 'brow')
  }
  const eye = (c, erx0, ery0, lid, excite, wet) => {
    const close = clamp(Math.max(u.uBlink, lid), 0, 1)
    const squash = 1 - close * close * (3 - 2 * close)
    const cc = [c[0], c[1] - ery0 * 0.2 * close]
    const ery = Math.max(ery0 * squash, 0.0005),
      erx = erx0 * (1 + 0.1 * close)
    const body = 1 - smooth(0.55, 0.8, close)
    ctx.save()
    ctx.translate(c[0], c[1])
    ctx.scale(erx0 * 1.25, ery0 * 1.15)
    const sg = ctx.createRadialGradient(0, 0, 0.85, 0, 0, 1.35)
    const sa = 0.13 * 0.55 * (1 - close) * (small ? 0 : 1)
    sg.addColorStop(0, `rgba(0,0,0,${sa})`)
    sg.addColorStop(0.5, `rgba(0,0,0,${sa * 0.5})`)
    sg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(0, 0, 1.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    if (body > 0.01) {
      const path = new Path2D()
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * Math.PI * 2,
          ny = Math.sin(t)
        const x = cc[0] + erx * (1 - 0.13 * ny) * Math.cos(t),
          y = cc[1] + ery * ny
        i ? path.lineTo(x, y) : path.moveTo(x, y)
      }
      path.closePath()
      ctx.save()
      ctx.globalAlpha = body
      ctx.clip(path)
      const amt = Math.min(1, 0.9 + 0.1 * excite + 0.1 * wet)
      const g = ctx.createLinearGradient(0, cc[1] + ery * 0.1, 0, cc[1] - ery * 0.72)
      const bead = [0.03, 0.03, 0.045]
      for (const s of [0, 0.25, 0.5, 0.75, 1])
        g.addColorStop(s, rgbStr(mix3(bead, refl, smooth(0, 1, s) * amt)))
      ctx.fillStyle = g
      ctx.fillRect(cc[0] - erx * 1.2, cc[1] - ery * 1.2, erx * 2.4, ery * 2.4)
      ctx.strokeStyle = rgbStr(bead)
      ctx.lineWidth = Math.min(erx, ery) * 0.26
      ctx.stroke(path)
      const fade = 1 - smooth(0.2, 0.5, close)
      if (fade > 0.01) {
        ctx.save()
        ctx.translate(cc[0], cc[1])
        ctx.scale(erx * 0.935, ery)
        ctx.translate(-0.1 - look[0], 0.5 - look[1])
        ctx.rotate(Math.atan2(0.28, 0.96))
        ctx.fillStyle = `rgba(255,255,255,${0.95 * fade})`
        ctx.beginPath()
        ctx.ellipse(0, 0, 0.5 + 0.06 * excite, 0.26 + 0.04 * excite, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      if (wet > 0 && !small) {
        ctx.save()
        ctx.translate(cc[0], cc[1])
        ctx.scale(erx, ery)
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * 0.95 * wet})`
        ctx.lineWidth = 0.1
        ctx.beginPath()
        ctx.arc(0, 0, 0.82, -2.6, -0.54)
        ctx.stroke()
        ctx.restore()
      }
      ctx.restore()
    }
    const shut = smooth(0.5, 0.85, close)
    if (shut > 0.01) {
      ctx.fillStyle = `rgba(11,11,15,${shut})`
      taper(ctx, arcPts([cc[0], cc[1] + erx0 * 1.05], erx0 * 1.1, -2.42, -0.72), lw, 0, 'arc')
    }
  }
  const mouthGrad = (y0, h) => {
    const g = ctx.createLinearGradient(0, y0, 0, y0 - h)
    g.addColorStop(0, 'rgb(38,10,17)')
    g.addColorStop(1, 'rgb(102,33,41)')
    return g
  }
  const tongue = (tc, tr, clipY) => {
    if (small) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(tc[0] - 1, clipY - 2, 2, 2)
    ctx.clip()
    ctx.fillStyle = 'rgb(222,97,122)'
    ctx.beginPath()
    ctx.ellipse(tc[0], tc[1], tr[0], tr[1], 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,204,219,0.65)'
    ctx.beginPath()
    ctx.ellipse(
      tc[0] - tr[0] * 0.35,
      tc[1] + tr[1] * 0.2,
      tr[0] * 0.32,
      tr[1] * 0.26,
      0,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.restore()
  }
  const openSmile = m => {
    ctx.fillStyle = mouthGrad(m[1] + 0.012, 0.06)
    ctx.beginPath()
    ctx.arc(m[0], m[1] + 0.012, 0.05, Math.PI, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    tongue([m[0], m[1] - 0.03], [0.03, 0.022], m[1] + 0.012)
  }
  const happy = (c, r, side) => {
    ctx.fillStyle = INK
    taper(ctx, arcPts(c, r, 0.42, 2.72), lw * 1.2, 0, 'arc')
    const ao = side < 0 ? 2.72 : 0.42,
      e = [c[0] + r * Math.cos(ao), c[1] + r * Math.sin(ao)]
    taper(ctx, [e, [e[0] + side * 0.032, e[1] + 0.014]], lw * 0.62, lw * 0.18)
    if (!small) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 0.02
      ctx.beginPath()
      ctx.arc(c[0], c[1], r - 0.034, 0.7, 2.4)
      ctx.stroke()
    }
  }
  const lens = (c, r, streakR) => {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.arc(c[0], c[1], r, 0, Math.PI * 2)
    ctx.fill()
    if (!small) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 0.02
      ctx.beginPath()
      ctx.arc(c[0], c[1], streakR, Math.PI * 0.55, Math.PI * 0.95)
      ctx.stroke()
    }
  }
  const mode = u.uFaceMode
  ctx.fillStyle = INK
  if (mode === 0) {
    let erx = 0.079,
      ery = 0.138
    if (small) {
      erx *= 1.32
      ery *= 1.14
    }
    const eL = [Lc[0] + 0.03, Lc[1] - 0.07],
      eR = [Rc[0] - 0.03, Rc[1] - 0.07]
    cheek([eL[0] - 0.09, eL[1] - ery - 0.035], 1.1)
    cheek([eR[0] + 0.09, eR[1] - ery - 0.035], 1.1)
    const sm = clamp(u.uSmile || 0, 0, 1)
    if (sm > 0.85) {
      happy([eL0[0], eL0[1] + 0.01], u.uEyeRX * 1.22, -1)
      happy([eR0[0], eR0[1] + 0.01], u.uEyeRX * 1.22, 1)
    } else {
      eye(
        [eL[0], eL[1] + 0.05 * sm],
        erx * u.uEyeScale[0],
        ery * u.uEyeScale[1] * (1 - 0.55 * sm),
        u.uLids[0],
        0,
        0,
      )
      eye(
        [eR[0], eR[1] + 0.05 * sm],
        erx * 0.97 * u.uEyeScale[0],
        ery * 0.98 * u.uEyeScale[1] * (1 - 0.55 * sm),
        u.uLids[1],
        0,
        0,
      )
    }
    if (u.uOutfit === 13) {
      ctx.fillStyle = INK
      if (!small)
        taper(
          ctx,
          arcPts(
            [
              (u.uEyeL[0] + u.uEyeR[0]) / 2 + look[0] + 0.03,
              (u.uEyeL[1] + u.uEyeR[1]) / 2 + look[1] - 0.375,
            ],
            0.045,
            -2.45,
            -0.69,
            14,
          ),
          lw * 0.7,
          0,
          'arc',
        )
    } else if (u.uRestMouth > 0.5 && sm < 0.99) {
      ctx.fillStyle = `rgba(11,11,15,${(1 - (small ? 0.5 : 0)) * (1 - sm)})`
      const m = [(eL[0] + eR[0]) / 2, (eL[1] + eR[1]) / 2 - ery - 0.03 + 0.02]
      taper(ctx, arcPts(m, 0.024, -2.5, -0.64, 12), lw * 0.68, 0, 'arc')
    }
    if (u.uOutfit === 7) {
      const g = -0.07 - u.uGlassY
      lens([u.uEyeL[0] + 0.03, u.uEyeL[1] + g], 0.17, 0.13)
      lens([u.uEyeR[0] - 0.03, u.uEyeR[1] + g], 0.17, 0.13)
    }
    brow(bl, u.uBrows[0], u.uBrows[1])
    brow(br, u.uBrows[2], u.uBrows[3])
  } else if (mode === 1) {
    cheek(cheekL, 1)
    cheek(cheekR, 1)
    happy([eL0[0], eL0[1] + 0.01], u.uEyeRX * 1.22, -1)
    happy([eR0[0], eR0[1] + 0.01], u.uEyeRX * 1.22, 1)
    brow([bl[0], bl[1] + 0.022], u.uBrows[0] + 0.004, u.uBrows[1] + 0.004)
    brow([br[0], br[1] + 0.022], u.uBrows[2] + 0.004, u.uBrows[3] + 0.004)
  } else if (mode === 2) {
    const eR = [Rc[0] - 0.03, Rc[1] - 0.05]
    eye([Lc[0] + 0.03, Lc[1] - 0.05], 0.079, 0.138, u.uLids[0], 0, 0)
    eye(eR, 0.079 * 1.22, 0.138 * 1.18, u.uLids[1], 0, 0)
    lens(eR, 0.155, 0.12)
    brow(bl, u.uBrows[0], u.uBrows[1])
    brow([br[0], br[1] + 0.07], u.uBrows[2], u.uBrows[3])
  } else if (mode === 5) {
    eye([eL0[0] - 0.012, eL0[1] + 0.03], 0.1, 0.14, 0, 0.4, 0)
    eye([eR0[0] + 0.012, eR0[1] + 0.03], 0.098, 0.138, 0, 0.4, 0)
    brow([bl[0] - 0.012, bl[1] + 0.1], 0, 0.02, lw * 1.3)
    brow([br[0] + 0.012, br[1] + 0.1], 0.02, 0, lw * 1.3)
    const m = [mid[0], mid[1] - 0.2]
    ctx.fillStyle = mouthGrad(m[1] + 0.064, 0.128)
    ctx.beginPath()
    ctx.ellipse(m[0], m[1], 0.046, 0.064, 0, 0, Math.PI * 2)
    ctx.fill()
    tongue([m[0], m[1] - 0.05], [0.036, 0.026], m[1] - 0.02)
  } else if (mode === 6) {
    for (const [c, dir] of [
      [eL0, 1],
      [eR0, -1],
    ]) {
      const rot = u.uTime * 7 * dir,
        pts = []
      for (let a = -Math.PI; a < Math.PI * 7; a += 0.12) {
        const r = 0.0125 * (a + Math.PI)
        if (r > rx * 1.38) break
        pts.push([c[0] + r * Math.cos(a - rot), c[1] + r * Math.sin(a - rot)])
      }
      ctx.fillStyle = INK
      taper(ctx, pts, lw * 0.66, lw * 0.66)
    }
  } else if (mode === 7) {
    cheek(cheekL, 1)
    cheek(cheekR, 1)
    eye([eL0[0], eL0[1] + 0.01], 0.088, 0.152, 0, u.uGlow, 0)
    eye([eR0[0], eR0[1] + 0.01], 0.086, 0.149, 0, u.uGlow, 0)
    brow([bl[0], bl[1] + 0.045], 0.02, 0.026)
    brow([br[0], br[1] + 0.045], 0.026, 0.02)
    openSmile([mid[0], mid[1] - 0.215])
  } else if (mode === 8) {
    cheek([cheekL[0] + 0.01, cheekL[1] + 0.025], 0.82)
    cheek(cheekR, 1.15)
    const cl = [eL0[0], eL0[1] - 0.005],
      vtx = [cl[0] + 0.05, cl[1]],
      t0 = [cl[0] - 0.06, cl[1] + 0.046],
      t1 = [cl[0] - 0.06, cl[1] - 0.04]
    ctx.fillStyle = INK
    taper(ctx, [t0, vtx], lw * 0.45, lw * 1.25)
    taper(ctx, [vtx, t1], lw * 1.25, lw * 0.45)
    taper(ctx, [t0, [t0[0] - 0.03, t0[1] + 0.02]], lw * 0.5, lw * 0.15)
    eye([eR0[0], eR0[1] + 0.01], 0.085, 0.148, 0, 1, 0)
    brow([bl[0], bl[1] - 0.014], -0.002, -0.016)
    brow([br[0], br[1] + 0.048], 0.024, 0.032)
    const m = [mid[0] + 0.02, mid[1] - 0.205]
    if (!small) {
      ctx.fillStyle = INK
      taper(ctx, arcPts([m[0], m[1] + 0.055], 0.066, -2.35, -0.8), lw * 0.7, 0, 'arc')
      tongue([m[0] + 0.03, m[1] - 0.017], [0.024, 0.03], m[1] - 0.009)
    }
  } else if (mode === 9) {
    for (const e of [eL0, eR0]) {
      const c = [e[0], e[1] + 0.06],
        r = u.uEyeRX * 1.12
      ctx.fillStyle = INK
      taper(ctx, arcPts(c, r, -2.62, -0.52), lw * 1.05, 0, 'arc')
      for (let j = 0; j < 3; j++) {
        const a = mix(-2.2, -0.94, j / 2),
          s = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]
        taper(
          ctx,
          [s, [s[0] + Math.cos(a) * 0.026, s[1] + Math.sin(a) * 0.026]],
          lw * 0.4,
          lw * 0.12,
        )
      }
    }
  } else if (mode === 10) {
    eye(eL0, 0.07, 0.122, 0, 0, 1)
    eye(eR0, 0.069, 0.12, 0, 0, 1)
    brow([bl[0], bl[1] + 0.004], -0.006, 0.026)
    brow([br[0], br[1] + 0.004], 0.026, -0.006)
    if (!small) {
      const m = [mid[0], mid[1] - 0.19],
        pts = []
      for (let dx = -0.052; dx <= 0.0521; dx += 0.004)
        pts.push([m[0] + dx, m[1] + 0.009 * Math.sin(dx * 72)])
      ctx.fillStyle = INK
      taper(ctx, pts, lw * 0.42 * 0.45, lw * 0.42 * 0.45)
      taper(ctx, pts.slice(5, pts.length - 5), lw * 0.42, lw * 0.42)
    }
  } else {
    for (let i = 0; i < 2; i++) {
      const c = i === 0 ? Lc : Rc
      if (i === 1 && u.uPeek > 0.5) {
        eye(c, 0.079, 0.138, 0.35, 0, 0)
        continue
      }
      const sx = u.uEyeRX * 1.05
      ctx.fillStyle = INK
      taper(ctx, [[c[0] - sx, c[1] - sx], c], lw * 0.5, lw * 1.05)
      taper(ctx, [c, [c[0] + sx, c[1] + sx]], lw * 1.05, lw * 0.5)
      taper(ctx, [[c[0] - sx, c[1] + sx], c], lw * 0.5, lw * 1.05)
      taper(ctx, [c, [c[0] + sx, c[1] - sx]], lw * 1.05, lw * 0.5)
    }
    const m = [(Lc[0] + Rc[0]) / 2 + 0.03, (Lc[1] + Rc[1]) / 2 - 0.19]
    if (!small) {
      ctx.fillStyle = INK
      taper(ctx, arcPts([m[0], m[1] + 0.08], 0.085, -2.2, -0.9), lw * 0.7, 0, 'arc')
      tongue([m[0] + 0.035, m[1] - 0.065], [0.045, 0.068], m[1] - 0.02)
    }
  }
}

export function createRenderer(opts = {}) {
  const canvas = opts.canvas || document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const info = {
    renderer: 'canvas',
    gpu: 'Canvas 2D, no WebGL',
    software: true,
    cpuTier: true,
    lost: false,
    compileMs: 0,
    parallel: false,
    facesReady: true,
    meshMs: 0,
  }
  let mesh = null,
    meshLoading = null,
    meshFailed = null
  const faceCv = document.createElement('canvas'),
    faceCtx = faceCv.getContext('2d', { willReadFrequently: true })
  const work = document.createElement('canvas'),
    workCtx = work.getContext('2d')
  const meshBase = (opts.base || '.') + '/mesh/momo'

  function decodePart(p, bin) {
    const posQ = new Uint16Array(p.vcount * 4)
    MeshoptDecoder.decodeVertexBuffer(
      new Uint8Array(posQ.buffer),
      p.vcount,
      8,
      new Uint8Array(bin, p.pos[0], p.pos[1]),
    )
    const ext = p.hi.map((h, i) => h - p.lo[i])
    const pos = new Float32Array(p.vcount * 3)
    for (let i = 0; i < p.vcount; i++)
      for (let k = 0; k < 3; k++) pos[i * 3 + k] = p.lo[k] + (posQ[i * 4 + k] / 65535) * ext[k]
    let nrm = null
    if (p.nrm) {
      const n8 = new Int8Array(p.vcount * 4)
      MeshoptDecoder.decodeVertexBuffer(
        new Uint8Array(n8.buffer),
        p.vcount,
        4,
        new Uint8Array(bin, p.nrm[0], p.nrm[1]),
        'OCTAHEDRAL',
      )
      nrm = new Float32Array(p.vcount * 3)
      for (let i = 0; i < p.vcount; i++) {
        const x = n8[i * 4] / 127,
          y = n8[i * 4 + 1] / 127,
          z = n8[i * 4 + 2] / 127,
          l = Math.hypot(x, y, z) || 1
        nrm[i * 3] = x / l
        nrm[i * 3 + 1] = y / l
        nrm[i * 3 + 2] = z / l
      }
    }
    const idx = p.idx32 ? new Uint32Array(p.icount) : new Uint16Array(p.icount)
    MeshoptDecoder.decodeIndexBuffer(
      new Uint8Array(idx.buffer),
      p.icount,
      p.idx32 ? 4 : 2,
      new Uint8Array(bin, p.idx[0], p.idx[1]),
    )
    return { ...p, pos, nrm, idx }
  }
  function loadMesh() {
    if (mesh || meshLoading) return
    const f = meshFailed
    if (f && performance.now() - f.at < Math.min(30000, 1000 * 2 ** f.n)) return
    const t0 = performance.now()
    const ok = r => {
      if (!r.ok) throw new Error(`${r.url} ${r.status}`)
      return r
    }
    meshLoading = Promise.all([
      fetch(meshBase + '.json')
        .then(ok)
        .then(r => r.json()),
      fetch(meshBase + '.lod.bin')
        .then(ok)
        .then(r => r.arrayBuffer()),
      MeshoptDecoder.ready,
    ])
      .then(([man, bin]) => {
        const lod = man.parts.filter(p => p.file === 'lod')
        const props = {}
        for (const v of VARS) props[v] = lod.filter(p => p.v === v).map(p => decodePart(p, bin))
        const mk = body => ({
          body,
          rest: null,
          cur: new Float32Array(body.vcount * 3),
          curN: new Float32Array(body.vcount * 3),
          bw: null,
          key: '',
          ao: new Float32Array(body.vcount).fill(1),
          sh: new Float32Array(body.vcount).fill(1),
          cursor: 0,
        })
        const b1 = mk(
            decodePart(
              lod.find(p => p.name === 'body'),
              bin,
            ),
          ),
          light = lod.find(p => p.name === 'body2')
        mesh = { b1, b2: light ? mk(decodePart(light, bin)) : b1, props }
        info.meshMs = Math.round(performance.now() - t0)
      })
      .catch(e => {
        meshFailed = { at: performance.now(), n: (meshFailed?.n || 0) + 1 }
        console.error('Momo could not load its mesh:', String(e))
      })
      .finally(() => {
        meshLoading = null
      })
  }
  const isReady = () => {
    loadMesh()
    return !!mesh
  }

  function snapOne(x, y, z, w, tip, tm, tb, out, o) {
    if (w > 0) [x, y, z] = bend(x, y, z, w, tip, tm)
    const h = 0.0015
    const D = (a, b, c) => bodyD(a, b, c, tm, tb)
    const d0 = D(x + h, y - h, z - h),
      d1 = D(x - h, y - h, z + h),
      d2 = D(x - h, y + h, z - h),
      d3 = D(x + h, y + h, z + h)
    const gx = (d0 - d1 - d2 + d3) / (4 * h),
      gy = (-d0 - d1 + d2 + d3) / (4 * h),
      gz = (-d0 + d1 - d2 + d3) / (4 * h)
    const gg = Math.max(gx * gx + gy * gy + gz * gz, 1e-6),
      d = D(x, y, z),
      gl = Math.sqrt(gg)
    out.pos[o] = x - (gx * d) / gg
    out.pos[o + 1] = y - (gy * d) / gg
    out.pos[o + 2] = z - (gz * d) / gg
    out.nrm[o] = gx / gl
    out.nrm[o + 1] = gy / gl
    out.nrm[o + 2] = gz / gl
  }
  function snapBody(M, u) {
    const tip = u.uTip
    const key = tip.map(v => v.toFixed(3)).join(',')
    if (M.key === key) return false
    const P = M.body.pos,
      n = M.body.vcount
    if (!M.rest) {
      M.rest = new Float32Array(n * 3)
      M.restN = new Float32Array(n * 3)
      M.bw = new Float32Array(n)
      M.near = new Uint8Array(n)
      const t0 = [0, 0, 1],
        tm0 = tipMid(t0),
        tb0 = tipEnd(t0),
        out = { pos: M.rest, nrm: M.restN }
      for (let i = 0; i < n; i++) {
        const x = P[i * 3],
          y = P[i * 3 + 1],
          z = P[i * 3 + 2]
        M.bw[i] = bendWeight(x, y, z)
        M.near[i] = M.bw[i] > 0 || y > -0.1 ? 1 : 0
        snapOne(x, y, z, 0, t0, tm0, tb0, out, i * 3)
      }
    }
    const bent = Math.abs(tip[0]) + Math.abs(tip[1]) + Math.abs(tip[2] - 1) > 1e-4
    M.cur.set(M.rest)
    M.curN.set(M.restN)
    if (bent) {
      const out = { pos: M.cur, nrm: M.curN }
      for (let i = 0; i < n; i++)
        if (M.near[i])
          snapOne(
            P[i * 3],
            P[i * 3 + 1],
            P[i * 3 + 2],
            M.bw[i],
            tip,
            u.uTipMid,
            u.uTipEnd,
            out,
            i * 3,
          )
    }
    M.key = key
    return true
  }
  function occD(occ, x, y, z) {
    const I = occ.I
    return (
      occ.f(
        I[0] * x + I[4] * y + I[8] * z + I[12],
        I[1] * x + I[5] * y + I[9] * z + I[13],
        I[2] * x + I[6] * y + I[10] * z + I[14],
      ) * occ.k
    )
  }
  function occludersFor(s, u) {
    const v = variantOf(s.outfit),
      o = HAT_OCC[v]
    if (!o || u.uFall > 0.001) return null
    const A = partFrame(o[0], s, u)
    return { I: M4.inv(A), k: Math.hypot(A[0], A[1], A[2]), f: o[1] }
  }
  function lightBody(M, u, T, all, ro, noShadow, occ) {
    const n = M.body.vcount,
      P = M.cur,
      Nn = M.curN
    const count = all ? n : Math.ceil(n / 4)
    const tm = u.uTipMid,
      tb = u.uTipEnd
    const Mw = M4.inv(T)
    const ol = [
      T[0] * L[0] + T[4] * L[1] + T[8] * L[2],
      T[1] * L[0] + T[5] * L[1] + T[9] * L[2],
      T[2] * L[0] + T[6] * L[1] + T[10] * L[2],
    ]
    for (let c = 0; c < count; c++) {
      const i = all ? c : (M.cursor + c) % n
      const x = P[i * 3],
        y = P[i * 3 + 1],
        z = P[i * 3 + 2],
        nx = Nn[i * 3],
        ny = Nn[i * 3 + 1],
        nz = Nn[i * 3 + 2]
      const wx = Mw[0] * x + Mw[4] * y + Mw[8] * z + Mw[12],
        wy = Mw[1] * x + Mw[5] * y + Mw[9] * z + Mw[13],
        wz = Mw[2] * x + Mw[6] * y + Mw[10] * z + Mw[14]
      const wnx = T[0] * nx + T[1] * ny + T[2] * nz,
        wny = T[4] * nx + T[5] * ny + T[6] * nz,
        wnz = T[8] * nx + T[9] * ny + T[10] * nz
      const wl = Math.hypot(wnx, wny, wnz) || 1
      if (
        (wnx * (ro[0] - wx) + wny * (ro[1] - wy) + wnz * (ro[2] - wz)) /
          wl /
          Math.hypot(ro[0] - wx, ro[1] - wy, ro[2] - wz) <
        -0.35
      ) {
        M.ao[i] = 1
        M.sh[i] = 1
        continue
      }
      let d1 = bodyD(x + nx * 0.08, y + ny * 0.08, z + nz * 0.08, tm, tb) * 0.72,
        d2 = bodyD(x + nx * 0.22, y + ny * 0.22, z + nz * 0.22, tm, tb) * 0.72
      if (occ) {
        d1 = Math.min(d1, occD(occ, x + nx * 0.08, y + ny * 0.08, z + nz * 0.08))
        d2 = Math.min(d2, occD(occ, x + nx * 0.22, y + ny * 0.22, z + nz * 0.22))
      }
      M.ao[i] = clamp(1 - 1.5 * (0.08 - d1 + (0.22 - d2) * 0.6), 0, 1)
      const bx = x + ((T[0] * wnx + T[4] * wny + T[8] * wnz) / wl) * 0.01,
        by = y + ((T[1] * wnx + T[5] * wny + T[9] * wnz) / wl) * 0.01,
        bz = z + ((T[2] * wnx + T[6] * wny + T[10] * wnz) / wl) * 0.01
      let res = 1,
        t = 0.04
      if (noShadow) {
        M.sh[i] = 1
        continue
      }
      for (let s = 0; s < 18; s++) {
        const px = bx + ol[0] * t,
          py = by + ol[1] * t,
          pz = bz + ol[2] * t
        let hh = bodyD(px, py, pz, tm, tb) * 0.72,
          r = (8 * hh) / t
        if (occ) {
          const hp = occD(occ, px, py, pz)
          r = Math.min(r, (4.5 * hp) / t)
          hh = Math.min(hh, hp)
        }
        if (r < res) res = r
        t += hh < 0.04 ? 0.04 : hh > 0.3 ? 0.3 : hh
        if (res < 0.004 || t > 3) break
      }
      M.sh[i] = res < 0 ? 0 : res > 1 ? 1 : res
    }
    if (!all) M.cursor = (M.cursor + count) % n
  }

  let W = 0,
    H = 0,
    img = null,
    buf32 = null,
    depth = null,
    shadowLayer = null,
    shadowKey = '',
    faceData = null,
    faceBox = null
  const bufs = {}
  const arr = (key, n) => {
    const x = bufs[key]
    if (x && x.length >= n) return x
    return (bufs[key] = new Float32Array(n))
  }
  function ensure(size) {
    if (W === size) return
    W = H = size
    img = new ImageData(size, size)
    buf32 = new Uint32Array(img.data.buffer)
    depth = new Float32Array(size * size)
    shadowLayer = new Uint32Array(size * size)
    shadowKey = ''
  }
  const pack = (r, g, b) =>
    ((255 << 24) |
      ((b > 255 ? 255 : b < 0 ? 0 : b) << 16) |
      ((g > 255 ? 255 : g < 0 ? 0 : g) << 8) |
      (r > 255 ? 255 : r < 0 ? 0 : r)) >>>
    0
  function project(vp, x, y, z, out, o) {
    const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12],
      cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13]
    const cz = vp[2] * x + vp[6] * y + vp[10] * z + vp[14],
      cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]
    out[o] = ((cx / cw) * 0.5 + 0.5) * W
    out[o + 1] = (0.5 - (cy / cw) * 0.5) * H
    out[o + 2] = cz / cw
  }
  const fcol = [0, 0, 0]
  const spotR = new Float32Array(BUG_SPOTS.length)
  let spotAA = 0.01
  function setSpots(bug, pixW) {
    spotAA = Math.max(0.004, pixW * 0.75)
    for (let i = 0; i < BUG_SPOTS.length; i++) {
      const k = clamp((bug - i * 0.07) / 0.3, 0, 1) - 1
      const g = 1 + 2.70158 * k * k * k + 1.70158 * k * k
      spotR[i] = g > 0 ? BUG_SPOTS[i][3] * g : -1
    }
    seamOn = clamp(bug * 1.6 - 0.6, 0, 1)
  }
  let seamOn = 0
  function spotAt(x, y, z) {
    let c = 0
    for (let i = 0; i < BUG_SPOTS.length; i++) {
      const r = spotR[i]
      if (r < 0) continue
      const S = BUG_SPOTS[i]
      const d = Math.hypot(x - S[0], y - S[1], z - S[2]) - r
      if (d < spotAA) {
        const g = r / S[3]
        c = Math.max(c, (1 - smooth(-spotAA, spotAA, d)) * smooth(0, 0.12, g))
      }
    }
    if (seamOn > 0 && z < BUG_SEAM.front[0])
      c = Math.max(
        c,
        (1 - smooth(BUG_SEAM.w - spotAA, BUG_SEAM.w + spotAA, Math.abs(x - BUG_SEAM.x))) *
          smooth(-BUG_SEAM.front[0], -BUG_SEAM.front[1], -z) *
          smooth(-0.7, -0.45, y) *
          seamOn,
      )
    return c
  }
  function nearSpot(x, y, z) {
    if (seamOn > 0 && z < BUG_SEAM.front[0] + 0.02 && Math.abs(x - BUG_SEAM.x) < 0.08) return true
    for (let i = 0; i < BUG_SPOTS.length; i++) {
      const S = BUG_SPOTS[i]
      if (spotR[i] > 0 && Math.hypot(x - S[0], y - S[1], z - S[2]) < spotR[i] + 0.09) return true
    }
    return false
  }
  function sampleFace(qx, qy) {
    const fb = faceBox
    const fx = (qx - fb.x0) * fb.s - 0.5,
      fy = (fb.y1 - qy) * fb.s - 0.5
    if (fx < 0 || fy < 0 || fx >= fb.w - 1 || fy >= fb.h - 1) return 0
    const ix = fx | 0,
      iy = fy | 0,
      tx = fx - ix,
      ty = fy - iy
    let r = 0,
      g = 0,
      b = 0,
      a = 0
    for (let k = 0; k < 4; k++) {
      const wgt = (k & 1 ? tx : 1 - tx) * (k >> 1 ? ty : 1 - ty)
      const o = ((iy + (k >> 1)) * fb.w + ix + (k & 1)) * 4,
        al = faceData[o + 3] * wgt
      if (al === 0) continue
      r += faceData[o] * al
      g += faceData[o + 1] * al
      b += faceData[o + 2] * al
      a += al
    }
    if (a < 0.03) return 0
    fcol[0] = r / a
    fcol[1] = g / a
    fcol[2] = b / a
    return a / 255
  }
  function raster(sx, sy, sz, vc, vq, i0, i1, i2, face) {
    const x0 = sx[i0],
      y0 = sy[i0],
      x1 = sx[i1],
      y1 = sy[i1],
      x2 = sx[i2],
      y2 = sy[i2]
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
    if (area >= 0) return
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))),
      maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)))
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))),
      maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)))
    if (minX > maxX || minY > maxY) return
    const ia = 1 / area,
      a0x = -(y2 - y1) * ia,
      a1x = -(y0 - y2) * ia
    const z2 = sz[i2],
      dz0 = sz[i0] - z2,
      dz1 = sz[i1] - z2,
      dzx = a0x * dz0 + a1x * dz1
    const r2 = vc[i2 * 3],
      g2 = vc[i2 * 3 + 1],
      b2 = vc[i2 * 3 + 2]
    const dr0 = vc[i0 * 3] - r2,
      dr1 = vc[i1 * 3] - r2,
      dg0 = vc[i0 * 3 + 1] - g2,
      dg1 = vc[i1 * 3 + 1] - g2,
      db0 = vc[i0 * 3 + 2] - b2,
      db1 = vc[i1 * 3 + 2] - b2
    const drx = a0x * dr0 + a1x * dr1,
      dgx = a0x * dg0 + a1x * dg1,
      dbx = a0x * db0 + a1x * db1
    let qx2 = 0,
      qy2 = 0,
      qz2 = 0,
      dqx0 = 0,
      dqx1 = 0,
      dqy0 = 0,
      dqy1 = 0,
      dqz0 = 0,
      dqz1 = 0,
      dqxx = 0,
      dqyx = 0,
      dqzx = 0
    if (face) {
      qx2 = vq[i2 * 3]
      qy2 = vq[i2 * 3 + 1]
      qz2 = vq[i2 * 3 + 2]
      dqx0 = vq[i0 * 3] - qx2
      dqx1 = vq[i1 * 3] - qx2
      dqy0 = vq[i0 * 3 + 1] - qy2
      dqy1 = vq[i1 * 3 + 1] - qy2
      dqz0 = vq[i0 * 3 + 2] - qz2
      dqz1 = vq[i1 * 3 + 2] - qz2
      dqxx = a0x * dqx0 + a1x * dqx1
      dqyx = a0x * dqy0 + a1x * dqy1
      dqzx = a0x * dqz0 + a1x * dqz1
    }
    for (let py = minY; py <= maxY; py++) {
      const cy = py + 0.5,
        cx0 = minX + 0.5,
        row = py * W
      let w0 = ((x1 - cx0) * (y2 - cy) - (x2 - cx0) * (y1 - cy)) * ia
      let w1 = ((x2 - cx0) * (y0 - cy) - (x0 - cx0) * (y2 - cy)) * ia
      let z = z2 + w0 * dz0 + w1 * dz1,
        r = r2 + w0 * dr0 + w1 * dr1,
        g = g2 + w0 * dg0 + w1 * dg1,
        b = b2 + w0 * db0 + w1 * db1
      let qx = 0,
        qy = 0,
        qz = 0
      if (face) {
        qx = qx2 + w0 * dqx0 + w1 * dqx1
        qy = qy2 + w0 * dqy0 + w1 * dqy1
        qz = qz2 + w0 * dqz0 + w1 * dqz1
      }
      for (let px = minX; px <= maxX; px++) {
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) {
          const o = row + px
          if (z < depth[o]) {
            depth[o] = z
            let cr = r,
              cg = g,
              cb = b
            if (face & 2) {
              const sp = spotAt(qx, qy, qz)
              if (sp > 0) {
                const lum = 0.3 * r + 0.59 * g + 0.11 * b
                cr += (10 + 0.24 * lum - cr) * sp
                cg += (9 + 0.21 * lum - cg) * sp
                cb += (11 + 0.23 * lum - cb) * sp
              }
            }
            const fa = face & 1 && qz > 0 ? sampleFace(qx, qy) : 0
            buf32[o] =
              fa > 0
                ? pack(
                    (cr + (fcol[0] - cr) * fa) | 0,
                    (cg + (fcol[1] - cg) * fa) | 0,
                    (cb + (fcol[2] - cb) * fa) | 0,
                  )
                : pack(cr | 0, cg | 0, cb | 0)
          }
        }
        w0 += a0x
        w1 += a1x
        z += dzx
        r += drx
        g += dgx
        b += dbx
        if (face) {
          qx += dqxx
          qy += dqyx
          qz += dqzx
        }
      }
    }
  }
  function rasterPattern(sx, sy, sz, vc, vq, i0, i1, i2, mat, nc, u) {
    const x0 = sx[i0],
      y0 = sy[i0],
      x1 = sx[i1],
      y1 = sy[i1],
      x2 = sx[i2],
      y2 = sy[i2]
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
    if (area >= 0) return
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2))),
      maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)))
    const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2))),
      maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)))
    if (minX > maxX || minY > maxY) return
    const ia = 1 / area,
      a0x = -(y2 - y1) * ia,
      a1x = -(y0 - y2) * ia
    const q = [0, 0, 0]
    for (let py = minY; py <= maxY; py++) {
      const cy = py + 0.5,
        cx0 = minX + 0.5
      let w0 = ((x1 - cx0) * (y2 - cy) - (x2 - cx0) * (y1 - cy)) * ia
      let w1 = ((x2 - cx0) * (y0 - cy) - (x0 - cx0) * (y2 - cy)) * ia
      for (let px = minX; px <= maxX; px++, w0 += a0x, w1 += a1x) {
        const w2 = 1 - w0 - w1
        if (w0 < 0 || w1 < 0 || w2 < 0) continue
        const z = w0 * sz[i0] + w1 * sz[i1] + w2 * sz[i2],
          o = py * W + px
        if (z >= depth[o]) continue
        depth[o] = z
        for (let j = 0; j < 3; j++)
          q[j] = w0 * vq[i0 * 3 + j] + w1 * vq[i1 * 3 + j] + w2 * vq[i2 * 3 + j]
        const pp = propPattern(mat, q, u),
          sel = pp[0],
          gain = pp[1]
        const o0 = i0 * nc * 3,
          o1 = i1 * nc * 3,
          o2 = i2 * nc * 3
        let r, g, b
        if (mat === 19 || mat === 44) {
          r = mix(
            (w0 * vc[o0] + w1 * vc[o1] + w2 * vc[o2]) * gain,
            w0 * vc[o0 + 3] + w1 * vc[o1 + 3] + w2 * vc[o2 + 3],
            sel,
          )
          g = mix(
            (w0 * vc[o0 + 1] + w1 * vc[o1 + 1] + w2 * vc[o2 + 1]) * gain,
            w0 * vc[o0 + 4] + w1 * vc[o1 + 4] + w2 * vc[o2 + 4],
            sel,
          )
          b = mix(
            (w0 * vc[o0 + 2] + w1 * vc[o1 + 2] + w2 * vc[o2 + 2]) * gain,
            w0 * vc[o0 + 5] + w1 * vc[o1 + 5] + w2 * vc[o2 + 5],
            sel,
          )
        } else {
          const k3 = Math.min(sel, nc - 1) * 3
          r = w0 * vc[o0 + k3] + w1 * vc[o1 + k3] + w2 * vc[o2 + k3]
          g = w0 * vc[o0 + k3 + 1] + w1 * vc[o1 + k3 + 1] + w2 * vc[o2 + k3 + 1]
          b = w0 * vc[o0 + k3 + 2] + w1 * vc[o1 + k3 + 2] + w2 * vc[o2 + k3 + 2]
        }
        buf32[o] = pack(r | 0, g | 0, b | 0)
      }
    }
  }
  function darkShadow(layers, tint, dark, box) {
    const [grid, pools, cores] = layers,
      [tr, tg, tb] = tint,
      { G, gw, gh, pxa, pxb, pya, pyb } = box
    const lerp = (g, o, tx, ty) =>
      (g[o] * (1 - tx) + g[o + 1] * tx) * (1 - ty) +
      (g[o + gw] * (1 - tx) + g[o + gw + 1] * tx) * ty
    for (let py = pya; py <= pyb; py++) {
      const fy = (py - pya) / G,
        iy = Math.min(gh - 2, fy | 0),
        ty = fy - iy
      for (let px = pxa; px <= pxb; px++) {
        const fx = (px - pxa) / G,
          ix = Math.min(gw - 2, fx | 0),
          tx = fx - ix,
          o = iy * gw + ix
        const light = lerp(grid, o, tx, ty),
          pool = lerp(pools, o, tx, ty),
          core = lerp(cores, o, tx, ty)
        const a = mix(light, pool + core - pool * core, dark)
        if (a < 0.002) continue
        const lit = pool * (1 - core) * 255
        const r = mix(tr * light, 0.88 * lit, dark) / a,
          g = mix(tg * light, 0.88 * lit, dark) / a,
          b = mix(tb * light, 0.92 * lit, dark) / a
        shadowLayer[py * W + px] =
          ((Math.round(a * 255) << 24) |
            (Math.round(b) << 16) |
            (Math.round(g) << 8) |
            Math.round(r)) >>>
          0
      }
    }
    buf32.set(shadowLayer)
  }
  function groundShadow(u, s, vp) {
    const yaw = s.yaw || 0,
      sxs = 1 + 0.05 * (s.squash || 0) + 0.18 * (s.dead || 0),
      lift = clamp(u.uLift * 6, 0, 1),
      dark = u.uDarkFloor,
      poolMax = SHADOW.pool * (1 - u.uSmall)
    const key = [
      W,
      Math.round(yaw / 0.02),
      Math.round(sxs * 200),
      Math.round(lift * 100),
      ...u.cDeep.map(c => Math.round(c * 64)),
      dark,
      poolMax,
    ].join('|')
    if (key === shadowKey) {
      buf32.set(shadowLayer)
      return
    }
    shadowKey = key
    shadowLayer.fill(0)
    const invVP = M4.inv(vp)
    const tint = mix3(u.cDeep, [0.16, 0.13, 0.19], 0.4)
    const tr = tint[0] * 0.6 * 255,
      tg = tint[1] * 0.6 * 255,
      tb = tint[2] * 0.6 * 255
    const cyw = Math.cos(yaw),
      syw = Math.sin(yaw)
    const foot = [u.uFoot[0] * sxs, u.uFoot[1] * sxs]
    const gy = GROUND - 0.001
    let bx0 = W,
      bx1 = 0,
      by0 = H,
      by1 = 0
    const pt = [0, 0, 0]
    for (const [cx, cz] of [
      [-1.35, -1.2],
      [1.35, -1.2],
      [-1.35, 1.2],
      [1.35, 1.2],
    ]) {
      project(vp, cx, gy, cz, pt, 0)
      bx0 = Math.min(bx0, pt[0])
      bx1 = Math.max(bx1, pt[0])
      by0 = Math.min(by0, pt[1])
      by1 = Math.max(by1, pt[1])
    }
    const pxa = Math.max(0, Math.floor(bx0)),
      pxb = Math.min(W - 1, Math.ceil(bx1)),
      pya = Math.max(0, Math.floor(by0)),
      pyb = Math.min(H - 1, Math.ceil(by1))
    const G = Math.max(1, Math.round(W / 110)),
      gw = Math.floor((pxb - pxa) / G) + 2,
      gh = Math.floor((pyb - pya) / G) + 2
    const [ln, lw, ll] = SHADOW.light,
      [dn, dw, dl] = SHADOW.dark
    const grid = arr('sgrid', gw * gh)
    grid.fill(0)
    const pools = dark ? arr('spool', gw * gh).fill(0) : null
    const cores = dark ? arr('score', gw * gh).fill(0) : null
    for (let gyi = 0; gyi < gh; gyi++) {
      const py = pya + gyi * G
      const ny = 1 - ((py + 0.5) / H) * 2
      const hx0 = invVP[4] * ny - invVP[8] + invVP[12],
        hy0 = invVP[5] * ny - invVP[9] + invVP[13],
        hz0 = invVP[6] * ny - invVP[10] + invVP[14],
        hw0 = invVP[7] * ny - invVP[11] + invVP[15]
      const hx1 = invVP[4] * ny + invVP[8] + invVP[12],
        hy1 = invVP[5] * ny + invVP[9] + invVP[13],
        hz1 = invVP[6] * ny + invVP[10] + invVP[14],
        hw1 = invVP[7] * ny + invVP[11] + invVP[15]
      for (let gxi = 0; gxi < gw; gxi++) {
        const px = pxa + gxi * G
        const nx = ((px + 0.5) / W) * 2 - 1
        const w0 = invVP[3] * nx + hw0,
          w1 = invVP[3] * nx + hw1
        const a0y = (invVP[1] * nx + hy0) / w0,
          a1y = (invVP[1] * nx + hy1) / w1
        const t = (gy - a0y) / (a1y - a0y)
        if (!(t > 0 && t < 1)) continue
        const a0x = (invVP[0] * nx + hx0) / w0,
          a0z = (invVP[2] * nx + hz0) / w0,
          a1x = (invVP[0] * nx + hx1) / w1,
          a1z = (invVP[2] * nx + hz1) / w1
        const gx = a0x + (a1x - a0x) * t,
          gz = a0z + (a1z - a0z) * t
        const g0 = cyw * gx + syw * gz,
          g1 = -syw * gx + cyw * gz
        const qx = g0 / foot[0],
          qz = g1 / foot[1],
          r2 = qx * qx + qz * qz,
          lx = (g0 - 0.14) / (foot[0] * 1.06),
          lz = (g1 + 0.12) / (foot[1] * 1.06)
        const past = Math.max(Math.sqrt(r2) - SHADOW.rim, 0),
          near = Math.exp(-past * past * SHADOW.near) * (1 - lift * 0.8),
          wide = Math.exp(-r2 * SHADOW.wide) * (1 - lift * 0.4),
          lean = Math.exp(-(lx * lx + lz * lz) * SHADOW.lean),
          edge = 1 - smooth(1.02, 1.3, Math.hypot(gx, gz * 1.15)),
          i = gyi * gw + gxi
        grid[i] = (near * ln + wide * lw + lean * ll) * edge
        if (dark) {
          pools[i] = Math.exp(-(gx * gx + gz * gz) * 2.4) * edge * poolMax
          cores[i] = (near * dn + wide * dw + lean * dl) * edge
        }
      }
    }
    if (dark) {
      darkShadow([grid, pools, cores], [tr, tg, tb], dark, { G, gw, gh, pxa, pxb, pya, pyb })
      return
    }
    const rgb = (Math.round(tb) << 16) | (Math.round(tg) << 8) | Math.round(tr)
    for (let py = pya; py <= pyb; py++) {
      const fy = (py - pya) / G,
        iy = Math.min(gh - 2, fy | 0),
        ty = fy - iy
      for (let px = pxa; px <= pxb; px++) {
        const fx = (px - pxa) / G,
          ix = Math.min(gw - 2, fx | 0),
          tx = fx - ix
        const o = iy * gw + ix
        const al =
          (grid[o] * (1 - tx) + grid[o + 1] * tx) * (1 - ty) +
          (grid[o + gw] * (1 - tx) + grid[o + gw + 1] * tx) * ty
        if (al < 0.002) continue
        shadowLayer[py * W + px] = ((Math.round(al * 255) << 24) | rgb) >>> 0
      }
    }
    buf32.set(shadowLayer)
  }

  let oneOff = false
  function render(size, s, outPx = size) {
    const u = uniformsFor(s, size)
    u.uTipMid = tipMid(u.uTip)
    u.uTipEnd = tipEnd(u.uTip)
    const M = outPx <= 260 ? mesh.b2 : mesh.b1
    ensure(size)
    depth.fill(Infinity)
    const cam = camera(1),
      vp = cam.vp
    const T = toObjectM(s),
      model = M4.inv(T)
    groundShadow(u, s, vp)
    snapBody(M, u)
    const noShadow = oneOff && size <= 160,
      occ = noShadow ? null : occludersFor(s, u)
    const pose = [
      s.yaw || 0,
      s.roll || 0,
      s.squash || 0,
      s.dead || 0,
      s.lift || 0,
      occ ? variantOf(s.outfit) : -1,
      ...u.uTip,
    ]
    const lp = M.litPose
    const jump = !lp || oneOff || pose.reduce((a, v, i) => a + Math.abs(v - lp[i]), 0) > 0.6
    lightBody(M, u, T, jump, cam.ro, noShadow, occ)
    if (jump) M.litPose = pose
    const n = M.body.vcount,
      P = M.cur,
      Nn = M.curN
    const sx = arr('sx', n),
      sy = arr('sy', n),
      sz = arr('sz', n),
      vc = arr('vc', n * 3)
    const tmp = [0, 0, 0],
      col = [0, 0, 0]
    const sheen = 0.3,
      sPow = 10,
      sAmt = 0.05,
      shell = s.outfit === 18
    const mvp = M4.mul(vp, model)
    for (let i = 0; i < n; i++) {
      const x = P[i * 3],
        y = P[i * 3 + 1],
        z = P[i * 3 + 2]
      project(mvp, x, y, z, tmp, 0)
      sx[i] = tmp[0]
      sy[i] = tmp[1]
      sz[i] = tmp[2]
      const wx = model[0] * x + model[4] * y + model[8] * z + model[12],
        wy = model[1] * x + model[5] * y + model[9] * z + model[13],
        wz = model[2] * x + model[6] * y + model[10] * z + model[14]
      const nx0 = Nn[i * 3],
        ny0 = Nn[i * 3 + 1],
        nz0 = Nn[i * 3 + 2]
      let nx = T[0] * nx0 + T[1] * ny0 + T[2] * nz0,
        ny = T[4] * nx0 + T[5] * ny0 + T[6] * nz0,
        nz = T[8] * nx0 + T[9] * ny0 + T[10] * nz0
      const nl0 = Math.hypot(nx, ny, nz) || 1
      nx /= nl0
      ny /= nl0
      nz /= nl0
      let vx = cam.ro[0] - wx,
        vy = cam.ro[1] - wy,
        vz = cam.ro[2] - wz
      const vl = Math.hypot(vx, vy, vz)
      vx /= vl
      vy /= vl
      vz /= vl
      const nv = nx * vx + ny * vy + nz * vz
      if (nv < -0.3) {
        vc[i * 3] = vc[i * 3 + 1] = vc[i * 3 + 2] = 0
        continue
      }
      const sh = nv < -0.35 ? 1 : M.sh[i],
        ao = nv < -0.35 ? 1 : M.ao[i]
      const nl = nx * L[0] + ny * L[1] + nz * L[2]
      const wrap = clamp((nl + 0.28) / 1.28, 0, 1)
      ramp(Math.pow(wrap, 1.15) * mix(1, sh, 0.8), u.cDeep, u.cShade, u.cBase, u.cLight, col)
      const aoK = mix(0.82, 1, ao),
        nf = Math.max(nx * F[0] + ny * F[1] + nz * F[2], 0),
        under = clamp(-ny, 0, 1) * ao
      const fres = Math.pow(1 - Math.max(nv, 0), 2.4) * sheen * (0.6 + 0.4 * sh)
      let hx = L[0] + vx,
        hy = L[1] + vy,
        hz = L[2] + vz
      const hl = Math.hypot(hx, hy, hz)
      const nh = Math.max((nx * hx + ny * hy + nz * hz) / hl, 0)
      const spec = Math.pow(nh, sPow) * sAmt * sh
      const satin = shell ? Math.pow(nh, 22) * 0.16 * sh : 0
      for (let k = 0; k < 3; k++)
        vc[i * 3 + k] =
          col[k] * aoK +
          u.cBase[k] * 0.12 * nf +
          u.cLight[k] * 0.18 * under +
          mix(u.cLight[k], 1, 0.3) * fres +
          spec +
          satin * SATIN[k]
      if (u.uGlow > 0) {
        const te = u.uTipEnd,
          gd = Math.hypot(x - te[0], y - te[1], z - te[2]),
          g = Math.exp(-gd * gd * 14) * u.uGlow
        const gk = clamp(g * 0.9, 0, 1)
        vc[i * 3] = mix(vc[i * 3], 1, gk) + g * 0.35
        vc[i * 3 + 1] = mix(vc[i * 3 + 1], 0.97, gk) + g * 0.3
        vc[i * 3 + 2] = mix(vc[i * 3 + 2], 0.82, gk) + g * 0.16
      }
      vc[i * 3] *= 255
      vc[i * 3 + 1] *= 255
      vc[i * 3 + 2] *= 255
    }
    const small = u.uSmall > 0.5
    const Lc = [u.uEyeL[0] + u.uLook[0], u.uEyeL[1] + u.uLook[1]],
      Rc = [u.uEyeR[0] + u.uLook[0], u.uEyeR[1] + u.uLook[1]]
    const fx0 = Math.min(Lc[0], Rc[0]) - 0.34,
      fx1 = Math.max(Lc[0], Rc[0]) + 0.34,
      fy0 = Math.min(Lc[1], Rc[1]) - 0.46,
      fy1 = Math.max(Lc[1], Rc[1]) + 0.4
    project(mvp, 0, 0, 1, tmp, 0)
    const ax = tmp[0],
      ay = tmp[1]
    project(mvp, 0.2, 0, 1, tmp, 0)
    const scale = Math.max(24, Math.min(900, (Math.hypot(tmp[0] - ax, tmp[1] - ay) / 0.2) * 1.5))
    const fw = Math.ceil((fx1 - fx0) * scale),
      fh = Math.ceil((fy1 - fy0) * scale)
    if (faceCv.width !== fw || faceCv.height !== fh) {
      faceCv.width = fw
      faceCv.height = fh
    } else {
      faceCtx.setTransform(1, 0, 0, 1, 0, 0)
      faceCtx.clearRect(0, 0, fw, fh)
    }
    faceCtx.setTransform(scale, 0, 0, -scale, -fx0 * scale, fy1 * scale)
    drawFace(faceCtx, u)
    faceData = faceCtx.getImageData(0, 0, fw, fh).data
    faceBox = { x0: fx0, y1: fy1, s: scale, w: fw, h: fh }
    for (let k = 3; k < faceData.length; k += 4)
      if (faceData[k]) {
        faceBox.any = true
        break
      }
    const idx = M.body.idx
    const bug = s.outfit === 18
    let near = null
    if (bug) {
      setSpots(u.uBug, u.uPixW)
      near = arr('near', n)
      for (let i = 0; i < n; i++) near[i] = nearSpot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) ? 1 : 0
    }
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t],
        b = idx[t + 1],
        c = idx[t + 2]
      const face =
        P[a * 3 + 2] > 0 &&
        P[a * 3] > fx0 - 0.1 &&
        P[a * 3] < fx1 + 0.1 &&
        P[a * 3 + 1] > fy0 - 0.1 &&
        P[a * 3 + 1] < fy1 + 0.1
      const spots = bug && (near[a] || near[b] || near[c]) ? 2 : 0
      raster(sx, sy, sz, vc, P, a, b, c, (face && faceBox.any ? 1 : 0) | spots)
    }
    const v = variantOf(s.outfit)
    const parts = v > 0 ? mesh.props[v] : null
    if (parts) {
      const Wm = s.outfit === 8 ? model : fallWorld(s, u, T)
      const nn = [0, 1, 0],
        V = [0, 0, 1],
        q = [0, 0, 0],
        lp = [0, 0, 0]
      for (const part of parts) {
        if ((part.small && !small) || (part.big && small)) continue
        if (partHidden(part, u)) continue
        const A = partFrame(part.frame, s, u),
          WA = M4.mul(part.mat === 23 || part.mat === 43 || part.mat >= 55 ? model : Wm, A),
          NM = M4.normal(WA),
          pvp = M4.mul(vp, WA)
        const localQ = LOCAL_Q.has(part.mat)
        const pn = part.vcount,
          pp = part.pos,
          pnrm = part.nrm
        const psx = arr('psx', pn),
          psy = arr('psy', pn),
          psz = arr('psz', pn),
          pq = arr('pq', pn * 3)
        const patterned = PATTERNED.has(part.mat)
        const ncol = part.mat === 6 ? 3 : patterned ? 2 : 1
        const pc = arr('pc', pn * 3 * ncol)
        for (let i = 0; i < pn; i++) {
          const x = pp[i * 3],
            y = pp[i * 3 + 1],
            z = pp[i * 3 + 2]
          project(pvp, x, y, z, tmp, 0)
          psx[i] = tmp[0]
          psy[i] = tmp[1]
          psz[i] = tmp[2]
          q[0] = A[0] * x + A[4] * y + A[8] * z + A[12]
          q[1] = A[1] * x + A[5] * y + A[9] * z + A[13]
          q[2] = A[2] * x + A[6] * y + A[10] * z + A[14]
          if (localQ) {
            pq[i * 3] = x
            pq[i * 3 + 1] = y
            pq[i * 3 + 2] = z
          } else {
            pq[i * 3] = q[0]
            pq[i * 3 + 1] = q[1]
            pq[i * 3 + 2] = q[2]
          }
          const wx = WA[0] * x + WA[4] * y + WA[8] * z + WA[12],
            wy = WA[1] * x + WA[5] * y + WA[9] * z + WA[13],
            wz = WA[2] * x + WA[6] * y + WA[10] * z + WA[14]
          if (pnrm) {
            const nx = pnrm[i * 3],
              ny = pnrm[i * 3 + 1],
              nz = pnrm[i * 3 + 2]
            nn[0] = NM[0] * nx + NM[3] * ny + NM[6] * nz
            nn[1] = NM[1] * nx + NM[4] * ny + NM[7] * nz
            nn[2] = NM[2] * nx + NM[5] * ny + NM[8] * nz
            const l = Math.hypot(nn[0], nn[1], nn[2]) || 1
            nn[0] /= l
            nn[1] /= l
            nn[2] /= l
          }
          V[0] = cam.ro[0] - wx
          V[1] = cam.ro[1] - wy
          V[2] = cam.ro[2] - wz
          const vl = Math.hypot(V[0], V[1], V[2])
          V[0] /= vl
          V[1] /= vl
          V[2] /= vl
          lp[0] = x
          lp[1] = y
          lp[2] = z
          const cs = propColors(part.mat, nn, V, q, u, lp)
          for (let k = 0; k < ncol; k++) {
            const ck = cs[k] || cs[0]
            for (let j = 0; j < 3; j++) pc[(i * ncol + k) * 3 + j] = ck[j] * 255
          }
        }
        const pidx = part.idx
        if (patterned)
          for (let t = 0; t < pidx.length; t += 3)
            rasterPattern(
              psx,
              psy,
              psz,
              pc,
              pq,
              pidx[t],
              pidx[t + 1],
              pidx[t + 2],
              part.mat,
              ncol,
              u,
            )
        else
          for (let t = 0; t < pidx.length; t += 3)
            raster(psx, psy, psz, pc, pq, pidx[t], pidx[t + 1], pidx[t + 2], false)
      }
      if (v === 2 && !small) drawChain(u, M4.mul(vp, Wm), Wm, cam.ro)
    }
  }
  const CH_RINGS = 19,
    CH_SIDES = 6
  const chainIdx = (() => {
    const idx = []
    for (let i = 0; i < CH_RINGS - 1; i++)
      for (let k = 0; k < CH_SIDES; k++) {
        const a = i * CH_SIDES + k,
          b = i * CH_SIDES + ((k + 1) % CH_SIDES)
        idx.push(a, b, a + CH_SIDES, b, b + CH_SIDES, a + CH_SIDES)
      }
    return idx
  })()
  function drawChain(u, pvp, Wm, ro) {
    const ctrl = chainPoints(u),
      n = CH_RINGS * CH_SIDES
    const csx = arr('csx', n),
      csy = arr('csy', n),
      csz = arr('csz', n),
      cc = arr('cc', n * 3)
    const tmp = [0, 0, 0],
      nn = [0, 0, 0],
      V = [0, 0, 0],
      NM = M4.normal(Wm)
    let up = [0, 0, 1]
    for (let i = 0; i < CH_RINGS; i++) {
      const t = (i / (CH_RINGS - 1)) * 6,
        j = Math.min(5, Math.floor(t)),
        f = t - j
      const p = [0, 1, 2].map(k => ctrl[j][k] + (ctrl[j + 1][k] - ctrl[j][k]) * f)
      const tg = [0, 1, 2].map(k => ctrl[j + 1][k] - ctrl[j][k]),
        tl = Math.hypot(...tg) || 1
      const T = tg.map(c => c / tl)
      let x = [
        up[1] * T[2] - up[2] * T[1],
        up[2] * T[0] - up[0] * T[2],
        up[0] * T[1] - up[1] * T[0],
      ]
      const xl = Math.hypot(...x) || 1
      x = x.map(c => c / xl)
      const y = [T[1] * x[2] - T[2] * x[1], T[2] * x[0] - T[0] * x[2], T[0] * x[1] - T[1] * x[0]]
      up = y
      for (let k = 0; k < CH_SIDES; k++) {
        const a = (k / CH_SIDES) * Math.PI * 2,
          cs = Math.cos(a),
          sn = Math.sin(a),
          o = i * CH_SIDES + k
        const ox = x[0] * cs + y[0] * sn,
          oy = x[1] * cs + y[1] * sn,
          oz = x[2] * cs + y[2] * sn
        const px = p[0] + ox * 0.012,
          py = p[1] + oy * 0.012,
          pz = p[2] + oz * 0.012
        project(pvp, px, py, pz, tmp, 0)
        csx[o] = tmp[0]
        csy[o] = tmp[1]
        csz[o] = tmp[2]
        nn[0] = NM[0] * ox + NM[3] * oy + NM[6] * oz
        nn[1] = NM[1] * ox + NM[4] * oy + NM[7] * oz
        nn[2] = NM[2] * ox + NM[5] * oy + NM[8] * oz
        const nl = Math.hypot(nn[0], nn[1], nn[2]) || 1
        nn[0] /= nl
        nn[1] /= nl
        nn[2] /= nl
        const wx = Wm[0] * px + Wm[4] * py + Wm[8] * pz + Wm[12],
          wy = Wm[1] * px + Wm[5] * py + Wm[9] * pz + Wm[13],
          wz = Wm[2] * px + Wm[6] * py + Wm[10] * pz + Wm[14]
        V[0] = ro[0] - wx
        V[1] = ro[1] - wy
        V[2] = ro[2] - wz
        const vl = Math.hypot(V[0], V[1], V[2])
        V[0] /= vl
        V[1] /= vl
        V[2] /= vl
        const c = propColors(3, nn, V, p, u)[0]
        cc[o * 3] = c[0] * 255
        cc[o * 3 + 1] = c[1] * 255
        cc[o * 3 + 2] = c[2] * 255
      }
    }
    for (let t = 0; t < chainIdx.length; t += 3) {
      const a = chainIdx[t],
        b = chainIdx[t + 1],
        c = chainIdx[t + 2]
      raster(csx, csy, csz, cc, null, a, b, c, false)
      raster(csx, csy, csz, cc, null, a, c, b, false)
    }
  }
  let small2 = null
  function toImage(size, out, target) {
    let pic = img
    if (size !== out) {
      if (!small2 || small2.width !== out) small2 = new ImageData(out, out)
      const d = small2.data,
        sdat = img.data
      for (let y = 0; y < out; y++)
        for (let x = 0; x < out; x++) {
          let r = 0,
            g = 0,
            b = 0,
            a = 0
          for (let j = 0; j < 2; j++)
            for (let i = 0; i < 2; i++) {
              const o = ((y * 2 + j) * size + x * 2 + i) * 4,
                al = sdat[o + 3]
              r += sdat[o] * al
              g += sdat[o + 1] * al
              b += sdat[o + 2] * al
              a += al
            }
          const o = (y * out + x) * 4
          if (a > 0) {
            d[o] = r / a
            d[o + 1] = g / a
            d[o + 2] = b / a
          }
          d[o + 3] = a / 4
        }
      pic = small2
    }
    if (target === canvas) {
      if (canvas.width !== out) {
        canvas.width = out
        canvas.height = out
      }
      ctx.putImageData(pic, 0, 0)
      return canvas
    }
    if (work.width !== out) {
      work.width = out
      work.height = out
    }
    workCtx.putImageData(pic, 0, 0)
    const tctx = target.getContext('2d')
    tctx.clearRect(0, 0, target.width, target.height)
    tctx.imageSmoothingQuality = 'high'
    tctx.drawImage(work, 0, 0, out, out, 0, 0, target.width, target.height)
    return target
  }
  function draw(target, px, state) {
    const s = { outfit: 0, look: [0, 0], ...state }
    if (!isReady()) return null
    px = Math.max(8, Math.round(px))
    if (target && target !== canvas) px = Math.min(px, Math.max(target.width, 16))
    const ss = px <= 128 || (px <= 220 && (globalThis.devicePixelRatio || 1) < 1.5) ? 2 : 1
    oneOff = !!target && target !== canvas
    render(px * ss, s, px)
    if (oneOff) {
      mesh.b1.litPose = null
      mesh.b2.litPose = null
    }
    return toImage(px * ss, px, target || canvas)
  }
  const drawAsync = (target, px, state) => Promise.resolve(draw(target, px, state))
  return { draw, drawAsync, canvas, info, isReady, preload: () => loadMesh() }
}
