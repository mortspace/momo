export const PALETTES = {
  persimmon: ['#FBC2A2', '#EF8C66', '#DA6C4D', '#B5523C'],
  honey: ['#FCE0A2', '#F3BD58', '#DE9E3C', '#B67B2C'],
  cornflower: ['#C2D3FB', '#86A3F0', '#6784DC', '#4D66BA'],
  matcha: ['#D3E7B0', '#A3C977', '#83AC5B', '#648A45'],
  wisteria: ['#D8CCF7', '#AA95E9', '#8C76D5', '#6E58B2'],
  rose: ['#F9C8D3', '#EE93A9', '#D8738D', '#B45A71'],
  ash: ['#E6E7EC', '#C6C8D0', '#A7AAB5', '#878A97'],
  teal: ['#C4EEE8', '#74CFC2', '#52B3A6', '#3B8F85'],
  sand: ['#F8E6CC', '#EBC99B', '#D6AC76', '#B58B58'],
  orchid: ['#EECDF6', '#CE93E4', '#B274CC', '#8E58A8'],
  slate: ['#D5DDF0', '#93A6CF', '#7487B6', '#586A96'],
  cherry: ['#FAC4C4', '#EC8686', '#D66666', '#B04B4F'],
  sky: ['#C9EAF8', '#87CCEE', '#63AFDA', '#4A8DB8'],
  lemon: ['#FBEFAA', '#F0D95E', '#DBBE3E', '#B3992E'],
  mint: ['#CDF2D6', '#8FD9A2', '#6CBF82', '#519C66'],
  piggy: ['#FFE0E6', '#FBB9C6', '#F095AA', '#D2728A'],
  lime: ['#E9F5B5', '#C9E26C', '#ABC64C', '#88A038'],
  indigo: ['#D6D8FA', '#A0A5F0', '#8086DC', '#6268BA'],
  ladybug: ['#FFC4BC', '#F57A6C', '#E05A4E', '#B8423B'],
}

export const OUTFITS = {
  rest: 0,
  cook: 1,
  investigate: 2,
  write: 3,
  dead: 4,
  builder: 5,
  music: 6,
  tutor: 7,
  garden: 8,
  designer: 9,
  director: 10,
  coach: 11,
  traveller: 12,
  money: 13,
  planner: 14,
  captain: 15,
  tester: 16,
  guard: 17,
  bug: 18,
}
export const FACE = {
  rest: 0,
  cook: 1,
  investigate: 2,
  write: 0,
  dead: 4,
  builder: 0,
  music: 1,
  tutor: 0,
  garden: 0,
  designer: 0,
  director: 0,
  coach: 0,
  traveller: 0,
  money: 0,
  planner: 0,
  captain: 0,
  tester: 0,
  guard: 0,
  bug: 0,
}

const hex3 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)

function smin(a, b, k) {
  const h = Math.min(1, Math.max(0, 0.5 + (0.5 * (b - a)) / k))
  return b * (1 - h) + a * h - k * h * (1 - h)
}
function sdEll(p, r) {
  const k0 = Math.hypot(p[0] / r[0], p[1] / r[1], p[2] / r[2])
  const k1 = Math.hypot(p[0] / r[0] / r[0], p[1] / r[1] / r[1], p[2] / r[2] / r[2])
  return (k0 * (k0 - 1)) / k1
}
function bodyD(p) {
  const e = sdEll([p[0], p[1] + 0.2, p[2]], [0.98, 0.74, 0.9])
  const a = [0, 0.02, 0],
    b = [0.24, 0.98, -0.04]
  const ba = b.map((v, i) => v - a[i]),
    pa = p.map((v, i) => v - a[i])
  const t = Math.max(
    0,
    Math.min(
      1,
      (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2),
    ),
  )
  const r = 0.6 + (0.085 - 0.6) * t
  const c = Math.hypot(pa[0] - ba[0] * t, pa[1] - ba[1] * t, pa[2] - ba[2] * t) - r
  return smin(e, c, 0.36)
}
function surfaceZ(x, y) {
  let z = 1.6
  for (let i = 0; i < 200; i++) {
    const d = bodyD([x, y, z])
    if (d < 0.0005) break
    z -= Math.max(d * 0.6, 0.002)
  }
  return z
}

const FOOT = [0.86, 0.78]

function fallFor(outfit, r) {
  const G = -0.92
  if (outfit === 1)
    return { anchor: [r.crown[0], r.crown[1], 0], land: [-0.3, G + 0.24, 0.9], rot: [1.15, 0] }
  if (outfit === 2) return { anchor: r.eyeR, land: [-0.55, G + 0.03, 0.95], rot: [-0.4, -1.45] }
  if (outfit === 3) return { anchor: r.pen.c, land: [0.2, G + 0.1, 0.92], rot: [0.35, 0] }
  if (outfit === 5)
    return { anchor: [r.helmet[0], r.helmet[1], 0], land: [-0.74, G + 0.26, 0.86], rot: [2.5, 0] }
  if (outfit === 6) return { anchor: [0, -0.02, -0.04], land: [0.1, G + 0.3, 0.7], rot: [0, -1.5] }
  if (outfit === 14) return { anchor: [0, -0.02, -0.04], land: [0.1, G + 0.3, 0.7], rot: [0, -1.5] }
  if (outfit === 10)
    return {
      anchor: [r.wear[outfit][0], r.wear[outfit][1], 0],
      land: [-0.36, G + 0.36, 0.95],
      rot: [1.25, 0],
    }
  if (outfit === 15)
    return {
      anchor: [r.wear[15][0], r.wear[15][1], 0],
      land: [-0.5, G + 0.14, 0.28],
      rot: [-0.18, 0],
    }
  if (outfit === 16)
    return {
      anchor: [r.wear[16][0], r.wear[16][1], 0],
      land: [0.0, G + 0.08, 0.12],
      rot: [0.15, 0.1],
    }
  if (outfit === 17) return { anchor: [0.6, G, -0.52], land: [0.6, G, -0.52], rot: [-0.22, 0.3] }
  if (outfit >= 9)
    return {
      anchor: [r.wear[outfit][0], r.wear[outfit][1], 0],
      land: [-0.74, G + 0.2, 0.86],
      rot: [2.2, 0],
    }
  if (outfit === 7)
    return {
      anchor: [(r.eyeL[0] + r.eyeR[0]) / 2, r.eyeL[1], r.eyeR[2]],
      land: [-0.35, G + 0.05, 0.98],
      rot: [-0.2, -1.4],
    }
  return { anchor: [0, 0, 0], land: [0, 0, 0], rot: [0, 0] }
}

const RIG = {
  eyeY: -0.03,
  pair: 0.06,
  gap: 0.2,
  crown: [0.0, 0.33, 1.5],
  helmet: [0.02, 0.27, 1.34],
  pen: { c: [0.08, 0.78, -0.18], d: [1, -0.22, 0.28] },
  wear: {
    9: [0.04, 0.3, 1.0],
    10: [0.06, 0.5, 1.0],
    11: [0.0, 0.22, 1.0],
    12: [0.0, 0.28, 1.0],
    13: [0.05, 0.736, 1.0],
    14: [0.0, 0.0, 1.0],
    15: [0.02, 0.16, 1.24],
    16: [0.0, 0.14, 1.0],
    17: [0.0, 0.0, 1.0],
    18: [0.0, 0.0, 1.0],
  },
}

export const hexToRgb = hex3

export const SHADOW = {
  rim: 0.7,
  near: 12,
  wide: 1.0,
  lean: 2.6,
  light: [0.08, 0.22, 0.04],
  dark: [0.22, 0.4, 0.08],
  pool: 0.045,
}

export const VARIANT = {
  1: 1,
  2: 2,
  3: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
  10: 9,
  11: 10,
  12: 11,
  13: 12,
  14: 13,
  15: 14,
  16: 15,
  17: 16,
  18: 17,
}
export const variantOf = outfit => VARIANT[outfit] || 0

let rigCache = null
export function rig() {
  if (rigCache) return rigCache
  const L = [RIG.pair - RIG.gap, RIG.eyeY],
    Rr = [RIG.pair + RIG.gap, RIG.eyeY]
  const at = (x, y) => [x, y, surfaceZ(x, y)]
  const nrm = v => {
    const e = 0.004,
      g = [0, 1, 2].map(i => {
        const a = v.slice(),
          b = v.slice()
        a[i] += e
        b[i] -= e
        return bodyD(a) - bodyD(b)
      })
    const l = Math.hypot(...g) || 1
    return g.map(x => x / l)
  }
  const eyeL = at(L[0], L[1]),
    eyeR = at(Rr[0], Rr[1])
  const cx = Rr[0] + 0.36,
    cy = Rr[1] - 0.46
  const tL = at(L[0] - 0.08, L[1]),
    tR = at(Rr[0] + 0.08, Rr[1])
  const tutor = { eyeL: tL, eyeR: tR, nL: nrm(tL), nR: nrm(tR) }
  return (rigCache = {
    tutor,
    eyeL,
    eyeR,
    monoN: nrm(eyeR),
    eyeLN: nrm(eyeL),
    chainEnd: [cx, cy, surfaceZ(cx, cy) - 0.01],
    crown: RIG.crown,
    helmet: RIG.helmet,
    pen: RIG.pen,
    wear: RIG.wear,
  })
}

export const DEFAULTS = {
  outfit: 0,
  palette: 'persimmon',
  yaw: 0,
  squash: 0,
  blink: 0,
  dead: 0,
  lift: 0,
  look: [0, 0],
  small: 0,
  fuzz: 1,
  time: 0,
}
export const INT_UNIFORMS = new Set(['uOutfit', 'uFaceMode'])
export function uniformsFor(state, px) {
  const s = { ...DEFAULTS, ...state }
  const r = rig()
  const pal = (s.colors || PALETTES[s.palette]).map(c => (typeof c === 'string' ? hex3(c) : c))
  const small = s.small ? 1 : 0
  const F = fallFor(s.outfit, r)
  const eyeL =
    s.outfit === 2
      ? [r.eyeL[0] - 0.06, r.eyeL[1], surfaceZ(r.eyeL[0] - 0.06, r.eyeL[1])]
      : s.outfit === 7
        ? r.tutor.eyeL
        : r.eyeL
  const tut = s.outfit === 7
  return {
    uRes: [px, px],
    uTime: s.time,
    uOutfit: s.outfit,
    uFaceMode:
      s.face ??
      (s.outfit === 4 ? 4 : s.outfit === 1 || s.outfit === 6 ? 1 : s.outfit === 2 ? 2 : 0),
    uTip: s.tip || [0, 0, 1],
    uFall: s.fall || 0,
    uGlassY: s.glassY || 0,
    uLeaf: s.leaf ?? 0.5,
    uAnchor: F.anchor,
    uLand: F.land,
    uFallRot: F.rot,
    uEyeLN: tut ? r.tutor.nL : r.eyeLN,
    uHelmet: r.helmet,
    uWear: r.wear[s.outfit] || [0, 0, 1],
    uPixW: 7.6 / (2.55 * px),
    uGlow: s.glow || 0,
    uRestMouth: s.restMouth ? 1 : 0,
    uSmile: s.smile || 0,
    uSleepy: s.sleepy || 0,
    uWink: s.wink || 0,
    uDarkFloor: s.darkFloor || 0,
    uBug: s.bug ?? 1,
    uAnt: s.ant || [1, 0, 0],
    uLegL: s.legL || [0, 0, 0],
    uLegR: s.legR || [0, 0, 0],
    uYaw: s.yaw,
    uSquash: s.squash,
    uBlink: s.blink,
    uDead: s.dead,
    uLift: s.lift,
    uSmall: small,
    uFuzz: small ? 0 : s.fuzz,
    uLook: [s.look[0], s.look[1]],
    cLight: pal[0],
    cBase: pal[1],
    cShade: pal[2],
    cDeep: pal[3],
    uEyeL: eyeL,
    uEyeR: tut ? r.tutor.eyeR : r.eyeR,
    uCrown: r.crown,
    uPenC: r.pen.c,
    uPenD: r.pen.d,
    uEyeRX: small ? 0.13 : 0.082,
    uEyeRY: small ? 0.17 : 0.114,
    uRoll: s.roll || 0,
    uHatTilt: s.hatTilt || 0,
    uBrowOn: s.browOn ?? 1,
    uBrows: s.brows || [0, 0, 0, 0],
    uEyeScale: s.eyeScale || [1, 1],
    uFoot: FOOT,
    uLids: s.lids || [0, 0],
    uPeek: s.peek ? 1 : 0,
    uMonoN: tut ? r.tutor.nR : r.monoN,
    uChainEnd: r.chainEnd,
  }
}
export function setUniforms(gl, U, vals) {
  for (const k in vals) {
    const loc = U[k]
    if (loc == null) continue
    const v = vals[k]
    if (INT_UNIFORMS.has(k)) gl.uniform1i(loc, v)
    else if (typeof v === 'number') gl.uniform1f(loc, v)
    else if (v.length === 2) gl.uniform2fv(loc, v)
    else if (v.length === 3) gl.uniform3fv(loc, v)
    else if (v.length === 4) gl.uniform4fv(loc, v)
    else if (v.length === 9) gl.uniformMatrix3fv(loc, false, v)
    else if (v.length === 16) gl.uniformMatrix4fv(loc, false, v)
  }
}
