import {
  HEAD,
  GROUND_C,
  LIB,
  BODY,
  PROPS,
  LIB2,
  FACE as FACE_SRC,
  SHADE,
  GSHADOW,
} from './shaders.js'
import {
  uniformsFor,
  setUniforms,
  variantOf,
  rig,
  PALETTES,
  OUTFITS,
  FACE,
  hexToRgb,
} from './character.js'
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
  TIP_B0,
  PARTS,
  OUTFIT_OF_VARIANT,
  NV,
  partHidden,
} from './rig.js'
const VARS = Array.from({ length: NV }, (_, i) => i + 1)

export { PALETTES, OUTFITS, FACE, hexToRgb }
export const SHADER_SRC = () => ({ PRE, VS_BODY, VS_PROP, FS_MAIN, FS_VOL, FS_VOL_BODY, VS_FULL })

const FACE_GROUPS = [0, 7, 1, 8, 2, 5, 6, 4, 9, 10]
const faceGroup = m => (FACE_GROUPS.includes(m) ? m : 4)
const VHEAD = HEAD.replace('out vec4 outColor;', '')
const PRE =
  '#version 300 es\nprecision highp int;\nprecision highp sampler3D;\n#define TIP_UNIFORMS\n'

const SHADOW = `
uniform sampler3D uBodyVol, uPropVol;
uniform vec3 uBodyLo, uBodyInv, uPropLo, uPropInv3;
uniform mat4 uToObj, uPropInv;
uniform float uPropK;
uniform int uHasProp;
float volD(sampler3D v, vec3 p, vec3 lo, vec3 inv){
  vec3 u = (p - lo)*inv;
  vec3 c = clamp(u, 0.0, 1.0);
  return textureLod(v, c, 0.0).r + length((u - c)/inv);
}
float bodyV(vec3 wp) {
  return volD(uBodyVol, (uToObj*vec4(wp, 1.0)).xyz, uBodyLo, uBodyInv)*0.72;
}
float propV(vec3 wp) {
  return uHasProp == 1 ? volD(uPropVol, (uPropInv*vec4(wp, 1.0)).xyz, uPropLo, uPropInv3)*uPropK*0.72 : 1e9;
}
float shadowV(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.04;
  for (int i = 0; i < 18; i++) {
    vec3 p = ro + rd*t;
    float hb = bodyV(p), hp = propV(p);
    res = min(res, min(8.0*hb, 4.5*hp)/t);
    t += clamp(min(hb, hp), 0.04, 0.3);
    if (res < 0.004 || t > 3.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float aoV(vec3 p, vec3 n){
  float o = (0.08 - bodyV(p + n*0.08)) + (0.22 - bodyV(p + n*0.22))*0.6;
  return clamp(1.0 - 1.5*o, 0.0, 1.0);
}
const vec3 SUN = vec3(${LIGHT.map(v => v.toFixed(7)).join(', ')});
`

const VS_BODY = `${VHEAD}${GROUND_C}${LIB}${BODY}${SHADOW}
in vec3 aPosQ;
uniform vec3 uPosLo, uPosExt;
uniform mat4 uVP, uModel;
uniform mat3 uNrmM;
uniform int uSnap;
uniform vec3 uCam;
out vec3 vObj, vN, vWorld;
out vec2 vLight;
vec3 gradB(vec3 p){
  const vec2 k = vec2(1.0, -1.0);
  const float h = 0.0015;
  return (k.xyy*bodyD(p + k.xyy*h) + k.yyx*bodyD(p + k.yyx*h) + k.yxy*bodyD(p + k.yxy*h) + k.xxx*bodyD(p + k.xxx*h))/(4.0*h);
}
vec3 tipRot(vec3 v, float amt) {
  v.xy = rot(uTip.x*amt)*v.xy;
  v.yz = rot(-uTip.y*amt)*v.yz;
  return v;
}
vec3 bend(vec3 p){
  vec3 d0 = normalize(TIP_B0 - TIP_A);
  float len = length(TIP_B0 - TIP_A);
  vec3 rel = p - TIP_A;
  float al = dot(rel, d0);
  vec3 perp = rel - al*d0;
  vec3 tm0 = TIP_A + d0*len*0.5;
  float e = sdEll(p - vec3(0.0, -0.2, 0.0), vec3(0.98, 0.74, 0.9));
  float t = smin(sdRoundCone(p, TIP_A, tm0, 0.6, 0.31), sdRoundCone(p, tm0, TIP_B0, 0.31, 0.085), 0.05);
  float w = 1.0 - clamp(0.5 + 0.5*(t - e)/0.36, 0.0, 1.0);
  vec3 b1 = TIP_A + tipRot(d0*al*uTip.z + perp, 0.5);
  vec3 b2 = uTipMid + tipRot(d0*(al - len*0.5)*uTip.z + perp, 1.0);
  return mix(p, mix(b1, b2, smoothstep(0.4, 0.6, al/len)), w);
}
void main(){
  vec3 p = uPosLo + aPosQ*uPosExt;
  if (uSnap == 1) p = bend(p);
  vec3 g = gradB(p);
  p -= g*bodyD(p)/max(dot(g, g), 1e-6);
  vec4 w = uModel*vec4(p, 1.0);
  vec3 N = normalize(uNrmM*g);
  vObj = p;
  vWorld = w.xyz;
  vN = N;
  vLight = dot(N, normalize(uCam - w.xyz)) < -0.35 ? vec2(1.0) : vec2(aoV(w.xyz, N), shadowV(w.xyz + N*0.01, SUN));
  gl_Position = uVP*w;
}`

const VS_PROP = `${VHEAD}${GROUND_C}${LIB}${BODY}${SHADOW}
in vec3 aPosQ;
in vec3 aNrm;
uniform vec3 uPosLo, uPosExt;
uniform mat4 uVP, uModel, uAttach;
uniform mat3 uNrmM;
uniform int uLit;
uniform vec3 uCam;
out vec3 vObj, vN, vWorld;
out vec2 vLight;
void main(){
  vec4 a = uAttach*vec4(uPosLo + aPosQ*uPosExt, 1.0);
  vec4 w = uModel*a;
  vec3 N = normalize(uNrmM*aNrm);
  vObj = a.xyz;
  vWorld = w.xyz;
  vN = N;
  vLight = uLit == 1 && dot(N, normalize(uCam - w.xyz)) > -0.35 ? vec2(aoV(w.xyz, N), shadowV(w.xyz + N*0.01, SUN)) : vec2(1.0);
  gl_Position = uVP*w;
}`

const FS_MAIN = `${HEAD}${GROUND_C}${LIB}${BODY}${LIB2}${FACE_SRC}${SHADE}
in vec3 vObj, vN, vWorld;
in vec2 vLight;
uniform float uMatId;
uniform vec3 uCam;
void main(){
  vec3 rd = normalize(vWorld - uCam);
  outColor = vec4(shadeWith(normalize(vN), vObj, rd, vLight.y, vLight.x, uMatId), 1.0);
}`

const VS_FULL = `#version 300 es
in vec2 aXZ;
void main() {
  gl_Position = vec4(aXZ, 0.0, 1.0);
}`
const VS_GROUND = `#version 300 es
in vec2 aXZ;
uniform mat4 uVP;
out vec3 vWorld;
void main() {
  vWorld = vec3(aXZ.x, ${GROUND.toFixed(2)} - 0.001, aXZ.y);
  gl_Position = uVP*vec4(vWorld, 1.0);
}`
const FS_GROUND = `${HEAD}${GROUND_C}${LIB}${GSHADOW}
in vec3 vWorld;
void main() {
  outColor = groundShadow(vWorld);
}`
const FS_VOL = `${HEAD}${GROUND_C}${LIB}${BODY}${PROPS}
uniform int uVolKind, uPack;
uniform vec3 uVolLo, uVolCell;
uniform float uVolZ;
float volSDF(vec3 p){
  if (uVolKind == 0) return bodyD(p);
  if (uVolKind == 1) return hatLocal(p);
  if (uVolKind == 2) return sdTorus(p, vec2(0.182, 0.019));
  if (uVolKind == 3) return min(min(pencilPart(p, 0.085, 0), pencilPart(p, 0.085, 1)), min(pencilPart(p, 0.085, 2), pencilPart(p, 0.085, 3)));
  if (uVolKind == 4) return helmetLocal(p);
  if (uVolKind == 5) return min(phonesPart(p, 0), min(phonesPart(p, 1), phonesPart(p, 2)));
  if (uVolKind == 6) return glasses(p).x;
  if (uVolKind == 7) return leaves(p).x;
  if (uVolKind == 8) return beretLocal(p);
  if (uVolKind == 9) return min(clapPart(p, 0), clapPart(p, 1));
  if (uVolKind == 10) return sweatLocal(p);
  if (uVolKind == 11) return min(min(gogPart(p, 0), gogPart(p, 1)), min(gogPart(p, 2), gogPart(p, 3)));
  if (uVolKind == 12) return min(pigEars(p), pigCoinLocal(p));
  if (uVolKind == 13) return min(setPart(p, 0), min(setPart(p, 1), setPart(p, 2)));
  if (uVolKind == 14) return min(min(min(skipperPart(p, 0), skipperPart(p, 1)), min(skipperPart(p, 2), skipperPart(p, 3))), skipperPart(p, 4));
  if (uVolKind == 15) return min(mirrorPart(p, 0), min(mirrorPart(p, 1), mirrorPart(p, 2)));
  if (uVolKind == 16) return min(signPart(p, 0), min(signPart(p, 1), signPart(p, 2)));
  return 1.0;
}
void main(){
  float d = volSDF(uVolLo + vec3(gl_FragCoord.xy, uVolZ + 0.5)*uVolCell);
  if (uPack == 1) {
    float v = clamp(d*0.25 + 0.5, 0.0, 1.0)*65535.0;
    outColor = vec4(floor(v/256.0), mod(floor(v), 256.0), 0.0, 255.0)/255.0;
  }
  else outColor = vec4(d, 0.0, 0.0, 1.0);
}`

const FS_VOL_BODY = FS_VOL.replace(PROPS, '').replace(
  /float volSDF\(vec3 p\)\{[\s\S]*?\n\}\n/,
  'float volSDF(vec3 p){ return bodyD(p); }\n',
)
const LOC = { aPosQ: 0, aNrm: 1, aXZ: 0 }
const BODY_VOL = { lo: [-1.3, -1.0, -1.05], hi: [1.3, 1.25, 1.05], n: [72, 64, 58] }
const PROP_VOL_FRAME = {
  1: 'hat',
  2: 'mono',
  3: 'pencil',
  4: 'helmet',
  5: 'identity',
  6: 'glasses',
  7: 'leaves',
  8: 'wear',
  9: 'wear',
  10: 'wear',
  11: 'wear',
  12: 'wear',
  13: 'wear',
  14: 'wear',
  15: 'wear',
  16: 'wear',
  17: 'wear',
}

function propVolBounds(v) {
  if (v === 7)
    return {
      lo: [TIP_B0[0] - 0.4, TIP_B0[1] - 0.12, TIP_B0[2] - 0.2],
      hi: [TIP_B0[0] + 0.4, TIP_B0[1] + 0.28, TIP_B0[2] + 0.2],
    }
  if (v === 6) {
    const r = rig().tutor
    const xs = [r.eyeL[0], r.eyeR[0]],
      zs = [r.eyeL[2], r.eyeR[2]]
    return {
      lo: [Math.min(...xs) - 0.36, r.eyeR[1] - 0.4, Math.min(...zs) - 0.66],
      hi: [Math.max(...xs) + 0.36, r.eyeR[1] + 0.25, Math.max(...zs) + 0.22],
    }
  }
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity]
  for (const p of PARTS)
    if (p.v === v && !p.small)
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p.lo[k])
        hi[k] = Math.max(hi[k], p.hi[k])
      }
  for (let k = 0; k < 3; k++) {
    const pad = Math.max(0, 0.08 - (hi[k] - lo[k])) / 2 + 0.02
    lo[k] -= pad
    hi[k] += pad
  }
  return { lo, hi }
}

function f32ToF16(val) {
  const f = new Float32Array(1),
    i = new Uint32Array(f.buffer)
  f[0] = val
  const x = i[0],
    sign = (x >>> 16) & 0x8000
  let e = ((x >>> 23) & 0xff) - 112,
    m = x & 0x7fffff
  if (e <= 0) return sign
  if (e >= 31) return sign | 0x7c00
  return sign | (e << 10) | (m >> 13)
}

export function createRenderer(opts = {}) {
  const flags = typeof location !== 'undefined' ? location.search : ''
  const attrs = {
    premultipliedAlpha: true,
    alpha: true,
    antialias: !flags.includes('nomsaa'),
    depth: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  }
  let canvas = opts.canvas || document.createElement('canvas')
  let gl = canvas.getContext('webgl2', attrs)
  if (!gl) throw new Error('WebGL2 unavailable')
  const gpuOf = g => {
    const d = g.getExtension('WEBGL_debug_renderer_info')
    return (d && g.getParameter(d.UNMASKED_RENDERER_WEBGL)) || 'unknown'
  }
  const cpuTier =
    !flags.includes('nosoft') &&
    (/swiftshader|llvmpipe|softpipe/i.test(gpuOf(gl)) || flags.includes('softtier'))
  if (cpuTier && attrs.antialias && !opts.canvas && (globalThis.devicePixelRatio || 1) >= 1.5) {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    canvas = document.createElement('canvas')
    gl = canvas.getContext('webgl2', { ...attrs, antialias: false })
    if (!gl) throw new Error('WebGL2 unavailable')
  }
  const info = {
    facesReady: false,
    lost: false,
    gpu: gpuOf(gl),
    software: false,
    cpuTier,
    compileMs: 0,
    parallel: false,
    meshMs: 0,
    renderer: 'mesh',
    floatVolumes: false,
    volumeUpdates: 0,
  }
  info.software = /swiftshader|basic render|llvmpipe|software/i.test(info.gpu)
  info.msaa = !!gl.getContextAttributes()?.antialias
  const bodyVolN = info.cpuTier ? BODY_VOL.n.map(v => Math.round(v / 2)) : BODY_VOL.n
  const par = flags.includes('nopar') ? null : gl.getExtension('KHR_parallel_shader_compile')
  info.parallel = !!par
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault()
    info.lost = true
  })
  const nonce =
    typeof location !== 'undefined' && new URLSearchParams(location.search).get('cold')
      ? '// ' + Math.random() + '\n'
      : ''
  const cam = camera(1)
  let S = null
  const t0 = performance.now()

  function mk(type, src) {
    const x = gl.createShader(type)
    gl.shaderSource(x, src)
    gl.compileShader(x)
    return x
  }
  function link(vs, fs) {
    const p = gl.createProgram()
    gl.attachShader(p, vs)
    gl.attachShader(p, fs)
    for (const k in LOC) gl.bindAttribLocation(p, LOC[k], k)
    gl.linkProgram(p)
    return { p, vs, fs, U: null, t0: performance.now() }
  }
  function ready(x) {
    if (!x) return false
    if (x.U) return true
    if (par && !gl.getProgramParameter(x.p, par.COMPLETION_STATUS_KHR)) return false
    if (!gl.getProgramParameter(x.p, gl.LINK_STATUS))
      throw new Error(
        (gl.getShaderInfoLog(x.vs) || '') +
          (gl.getShaderInfoLog(x.fs) || '') +
          (gl.getProgramInfoLog(x.p) || ''),
      )
    x.U = {}
    const n = gl.getProgramParameter(x.p, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) {
      const u = gl.getActiveUniform(x.p, i)
      x.U[u.name] = gl.getUniformLocation(x.p, u.name)
    }
    return true
  }

  function setup() {
    info.floatVolumes = !flags.includes('nofloat') && !!gl.getExtension('EXT_color_buffer_float')
    const vsBody = mk(gl.VERTEX_SHADER, PRE + nonce + VS_BODY)
    const bodyFs = g =>
      mk(
        gl.FRAGMENT_SHADER,
        PRE + `#define PROP 0\n#define MESH\n#define FACE_ONLY ${g}\n` + nonce + FS_MAIN,
      )
    S = {
      vsBody,
      bodyFs,
      body: {},
      prop: null,
      vol: null,
      startProps() {
        if (S.prop) return
        S.prop = link(
          mk(gl.VERTEX_SHADER, PRE + nonce + VS_PROP),
          mk(
            gl.FRAGMENT_SHADER,
            PRE +
              '#define PROP 0\n#define MESH\n#define ALLMATS\n#define FACE_ONLY -1\n' +
              nonce +
              FS_MAIN,
          ),
        )
        S.vol = link(mk(gl.VERTEX_SHADER, VS_FULL), mk(gl.FRAGMENT_SHADER, PRE + nonce + FS_VOL))
      },
      ground: link(
        mk(gl.VERTEX_SHADER, VS_GROUND),
        mk(gl.FRAGMENT_SHADER, '#version 300 es\n' + FS_GROUND),
      ),
      volBody: link(
        mk(gl.VERTEX_SHADER, VS_FULL),
        mk(gl.FRAGMENT_SHADER, PRE + nonce + FS_VOL_BODY),
      ),
      mesh: null,
      meshLoading: null,
      meshFailed: null,
      propVol: {},
      bodyVol: null,
      bodyKey: '',
      fbo: null,
      allStarted: false,
    }
    S.body[0] = link(vsBody, bodyFs(0))
    S.full = gl.createVertexArray()
    gl.bindVertexArray(S.full)
    const fb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, fb)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    S.groundVAO = gl.createVertexArray()
    gl.bindVertexArray(S.groundVAO)
    const gb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, gb)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1.5, -1.5, 1.5, -1.5, 1.5, 1.5, -1.5, -1.5, 1.5, 1.5, -1.5, 1.5]),
      gl.STATIC_DRAW,
    )
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)
    buildChain()
  }
  function startRest() {
    if (S.allStarted) return
    if (!par && performance.now() - (S.lastStart || 0) < 1200) return
    const g = FACE_GROUPS.find(x => !S.body[x])
    if (g == null) {
      S.allStarted = true
      return
    }
    S.body[g] = link(S.vsBody, S.bodyFs(g))
    S.lastStart = performance.now()
  }
  const propsReady = () =>
    !!S.prop && (par || performance.now() - S.prop.t0 > 150) && ready(S.prop) && ready(S.vol)
  function coreReady() {
    const ok = ready(S.body[0]) && ready(S.ground) && ready(S.volBody)
    if (ok && !info.compileMs) info.compileMs = Math.round(performance.now() - t0)
    if (ok) {
      S.startProps()
      startRest()
    }
    if (ok && par && S.allStarted && !info.facesReady)
      info.facesReady = FACE_GROUPS.every(g => ready(S.body[g]))
    return ok
  }

  const meshBase = (opts.base || '.') + '/mesh/momo'
  function loadMesh() {
    if (S.mesh || S.meshLoading) return
    const f = S.meshFailed
    if (f && performance.now() - f.at < Math.min(30000, 1000 * 2 ** f.n)) return
    const tm = performance.now()
    const ok = r => {
      if (!r.ok) throw new Error(`${r.url} ${r.status}`)
      return r
    }
    const main = info.cpuTier ? 'lod' : 'body'
    S.meshLoading = Promise.all([
      fetch(meshBase + '.json')
        .then(ok)
        .then(r => r.json()),
      fetch(meshBase + '.' + main + '.bin')
        .then(ok)
        .then(r => r.arrayBuffer()),
      MeshoptDecoder.ready,
    ])
      .then(([man, bin]) => {
        if (info.lost) return
        if (!Array.isArray(man?.parts)) throw new Error('mesh manifest has no parts')
        const M = { man, body: null, props: {}, pending: {} }
        M.body = upload(
          man.parts.find(p => p.file === main && p.name === 'body'),
          bin,
        )
        if (info.cpuTier)
          for (const v of VARS)
            M.props[v] = man.parts
              .filter(p => p.file === 'lod' && p.v === v)
              .map(p => upload(p, bin))
        S.mesh = M
        info.meshMs = Math.round(performance.now() - tm)
        info.meshKB = Math.round(bin.byteLength / 1024)
        const idle = window.requestIdleCallback || (f => setTimeout(f, 200))
        if (!info.cpuTier)
          idle(() => {
            for (const v of VARS) loadVariant(v)
          })
      })
      .catch(e => {
        info.error = String(e)
        S.meshFailed = { at: performance.now(), n: (S.meshFailed?.n || 0) + 1 }
        console.error('Momo could not load its mesh:', info.error)
      })
      .finally(() => {
        S.meshLoading = null
      })
  }
  function loadVariant(v) {
    const M = S.mesh
    if (!M || M.props[v] || M.pending[v]) return
    M.failed = M.failed || {}
    const f = M.failed[v]
    if (f && performance.now() - f.at < Math.min(30000, 1000 * 2 ** f.n)) return
    const file = 'v' + v
    M.pending[v] = fetch(meshBase + '.' + file + '.bin')
      .then(r => {
        if (!r.ok) throw new Error(`${r.url} ${r.status}`)
        return r.arrayBuffer()
      })
      .then(bin => {
        if (info.lost || S.mesh !== M) return
        M.props[v] = M.man.parts.filter(p => p.file === file).map(p => upload(p, bin))
      })
      .catch(e => {
        info.error = String(e)
        M.failed[v] = { at: performance.now(), n: (M.failed[v]?.n || 0) + 1 }
        console.error('Momo could not load an outfit:', info.error)
      })
      .finally(() => {
        delete M.pending[v]
      })
  }
  function decode(bin, [at, len], count, size, index, filter) {
    const out = new Uint8Array(count * size),
      src = new Uint8Array(bin, at, len)
    if (index) MeshoptDecoder.decodeIndexBuffer(out, count, size, src)
    else MeshoptDecoder.decodeVertexBuffer(out, count, size, src, filter)
    return out
  }
  function upload(p, bin) {
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const vb = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vb)
    gl.bufferData(gl.ARRAY_BUFFER, decode(bin, p.pos, p.vcount, 8), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(LOC.aPosQ)
    gl.vertexAttribPointer(LOC.aPosQ, 3, gl.UNSIGNED_SHORT, true, 8, 0)
    if (p.nrm) {
      const nb = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, nb)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        decode(bin, p.nrm, p.vcount, 4, false, 'OCTAHEDRAL'),
        gl.STATIC_DRAW,
      )
      gl.enableVertexAttribArray(LOC.aNrm)
      gl.vertexAttribPointer(LOC.aNrm, 3, gl.BYTE, true, 4, 0)
    }
    const ib = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      decode(bin, p.idx, p.icount, p.idx32 ? 4 : 2, true),
      gl.STATIC_DRAW,
    )
    gl.bindVertexArray(null)
    return {
      ...p,
      vao,
      ext: p.hi.map((h, i) => h - p.lo[i]),
      type: p.idx32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
    }
  }

  function buildChain() {
    const c = (S.chain = {
      vao: gl.createVertexArray(),
      pb: gl.createBuffer(),
      nb: gl.createBuffer(),
      ib: gl.createBuffer(),
      sides: 8,
      rings: 25,
    })
    gl.bindVertexArray(c.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, c.pb)
    gl.enableVertexAttribArray(LOC.aPosQ)
    gl.vertexAttribPointer(LOC.aPosQ, 3, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, c.nb)
    gl.enableVertexAttribArray(LOC.aNrm)
    gl.vertexAttribPointer(LOC.aNrm, 3, gl.FLOAT, false, 0, 0)
    const idx = []
    for (let i = 0; i < c.rings - 1; i++)
      for (let k = 0; k < c.sides; k++) {
        const a = i * c.sides + k,
          b = i * c.sides + ((k + 1) % c.sides)
        idx.push(a, b, a + c.sides, b, b + c.sides, a + c.sides)
      }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, c.ib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW)
    c.count = idx.length
    c.pos = new Float32Array(c.rings * c.sides * 3)
    c.nrm = new Float32Array(c.pos.length)
    gl.bindVertexArray(null)
  }
  function updateChain(u) {
    const c = S.chain,
      ctrl = chainPoints(u)
    let up = [0, 0, 1]
    for (let i = 0; i < c.rings; i++) {
      const t = (i / (c.rings - 1)) * 6,
        j = Math.min(5, Math.floor(t)),
        f = t - j
      const p = ctrl[j].map((v, k) => v + (ctrl[j + 1][k] - v) * f)
      const tg = ctrl[j + 1].map((v, k) => v - ctrl[j][k])
      const tl = Math.hypot(...tg) || 1
      const T = tg.map(v => v / tl)
      let x = [
        up[1] * T[2] - up[2] * T[1],
        up[2] * T[0] - up[0] * T[2],
        up[0] * T[1] - up[1] * T[0],
      ]
      const xl = Math.hypot(...x) || 1
      x = x.map(v => v / xl)
      const y = [T[1] * x[2] - T[2] * x[1], T[2] * x[0] - T[0] * x[2], T[0] * x[1] - T[1] * x[0]]
      up = y
      for (let k = 0; k < c.sides; k++) {
        const a = (k / c.sides) * Math.PI * 2,
          cs = Math.cos(a),
          sn = Math.sin(a)
        const o = (i * c.sides + k) * 3
        for (let d = 0; d < 3; d++) {
          const n = x[d] * cs + y[d] * sn
          c.nrm[o + d] = n
          c.pos[o + d] = p[d] + n * 0.012
        }
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, c.pb)
    gl.bufferData(gl.ARRAY_BUFFER, c.pos, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, c.nb)
    gl.bufferData(gl.ARRAY_BUFFER, c.nrm, gl.DYNAMIC_DRAW)
  }

  function makeVolume(n, lo, hi) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_3D, tex)
    gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R16F, n[0], n[1], n[2])
    for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R])
      gl.texParameteri(gl.TEXTURE_3D, k, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return { tex, n, lo, hi, inv: hi.map((h, i) => 1 / (h - lo[i])), fb: gl.createFramebuffer() }
  }
  function fillVolume(V, kind, u) {
    const P = kind === 0 ? S.volBody : S.vol
    gl.useProgram(P.p)
    setUniforms(gl, P.U, u)
    const cell = V.hi.map((h, i) => (h - V.lo[i]) / V.n[i])
    gl.uniform1i(P.U.uVolKind, kind)
    gl.uniform3fv(P.U.uVolLo, V.lo)
    gl.uniform3fv(P.U.uVolCell, cell)
    gl.uniform1i(P.U.uPack, info.floatVolumes ? 0 : 1)
    gl.bindVertexArray(S.full)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)
    gl.disable(gl.CULL_FACE)
    gl.viewport(0, 0, V.n[0], V.n[1])
    if (info.floatVolumes) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, V.fb)
      for (let z = 0; z < V.n[2]; z++) {
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, V.tex, 0, z)
        gl.uniform1f(P.U.uVolZ, z)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
    } else {
      const rb = gl.createRenderbuffer(),
        fb = gl.createFramebuffer()
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb)
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, V.n[0], V.n[1])
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb)
      const slice = new Uint8Array(V.n[0] * V.n[1] * 4),
        half = new Uint16Array(V.n[0] * V.n[1] * V.n[2])
      for (let z = 0; z < V.n[2]; z++) {
        gl.uniform1f(P.U.uVolZ, z)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.readPixels(0, 0, V.n[0], V.n[1], gl.RGBA, gl.UNSIGNED_BYTE, slice)
        for (let i = 0; i < V.n[0] * V.n[1]; i++)
          half[z * V.n[0] * V.n[1] + i] = f32ToF16(
            ((slice[i * 4] * 256 + slice[i * 4 + 1]) / 65535 - 0.5) * 4,
          )
      }
      gl.bindTexture(gl.TEXTURE_3D, V.tex)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texSubImage3D(
        gl.TEXTURE_3D,
        0,
        0,
        0,
        0,
        V.n[0],
        V.n[1],
        V.n[2],
        gl.RED,
        gl.HALF_FLOAT,
        half,
      )
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
      gl.deleteFramebuffer(fb)
      gl.deleteRenderbuffer(rb)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    info.volumeUpdates++
  }
  function bodyVolume(s, u) {
    const key = u.uTip.map(v => v.toFixed(2)).join(',')
    if (!S.bodyVol) S.bodyVol = makeVolume(bodyVolN, BODY_VOL.lo, BODY_VOL.hi)
    const now = performance.now()
    const allowed = !S.bodyKey || (info.floatVolumes && now - S.bodyAt > (info.cpuTier ? 200 : 33))
    if (key !== S.bodyKey && allowed) {
      fillVolume(S.bodyVol, 0, u)
      S.bodyKey = key
      S.bodyAt = now
    }
    return S.bodyVol
  }
  function propVolume(v) {
    const key = v
    if (S.propVol[key]) return S.propVol[key]
    const b = propVolBounds(v)
    const n = b.hi.map((h, i) =>
      Math.max(8, Math.min(96, Math.ceil((h - b.lo[i]) / (info.cpuTier ? 0.035 : 0.02)))),
    )
    const V = makeVolume(n, b.lo, b.hi)
    const u = uniformsFor(
      { outfit: 0, tip: [0, 0, 1], look: [0, 0], glassY: 0, leaf: 0.5, hatTilt: 0 },
      64,
    )
    u.uTipMid = tipMid([0, 0, 1])
    u.uTipEnd = tipEnd([0, 0, 1])
    fillVolume(V, v, u)
    return (S.propVol[key] = V)
  }

  function ensureFbo(px) {
    S.fbos = S.fbos || {}
    if (S.fbos[px]) return S.fbos[px]
    const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES))
    const ms = gl.createFramebuffer(),
      c = gl.createRenderbuffer(),
      d = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, c)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, px, px)
    gl.bindRenderbuffer(gl.RENDERBUFFER, d)
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, px, px)
    gl.bindFramebuffer(gl.FRAMEBUFFER, ms)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, c)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d)
    const rs = gl.createFramebuffer(),
      rc = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, rc)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, px, px)
    gl.bindFramebuffer(gl.FRAMEBUFFER, rs)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rc)
    return (S.fbos[px] = { px, ms, rs, c, d, rc, pixels: new Uint8Array(px * px * 4) })
  }

  const P_READY = () => coreReady()
  function isReady(outfit) {
    if (info.lost || !S) return false
    const ok = coreReady()
    loadMesh()
    const M = S.mesh,
      v = variantOf(outfit ?? 0)
    if (M && v > 0) loadVariant(v)
    return ok && !!M && (v === 0 || (!!M.props[v] && propsReady()))
  }

  function bindShadow(U, bv, pv, T, propInv, k) {
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_3D, bv.tex)
    gl.uniform1i(U.uBodyVol, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_3D, (pv || bv).tex)
    gl.uniform1i(U.uPropVol, 1)
    setUniforms(gl, U, {
      uBodyLo: bv.lo,
      uBodyInv: bv.inv,
      uToObj: T,
      uPropLo: (pv || bv).lo,
      uPropInv3: (pv || bv).inv,
      uPropInv: propInv,
      uPropK: k,
    })
    gl.uniform1i(U.uHasProp, pv ? 1 : 0)
  }

  function render(px, s) {
    const u = uniformsFor(s, px)
    u.uTipMid = tipMid(u.uTip)
    u.uTipEnd = tipEnd(u.uTip)
    const T = toObjectM(s)
    const bodyModel = M4.inv(T)
    const bodyNrm = [T[0], T[4], T[8], T[1], T[5], T[9], T[2], T[6], T[10]]
    const M = S.mesh
    const v = variantOf(s.outfit)
    const props = v > 0 && propsReady() ? M.props[v] : null
    const bv = bodyVolume(s, u)
    let pv = null,
      propInv = M4.id(),
      k = 1,
      W = bodyModel
    if (props) {
      pv = v === 2 || v === 6 || v === 17 ? null : propVolume(v)
      W = s.outfit === 8 ? bodyModel : fallWorld(s, u, T)
      const frame = PROP_VOL_FRAME[v]
      let A = M4.id()
      if (frame === 'leaves') {
        const e = u.uTipEnd
        A = M4.tr(e[0] - TIP_B0[0], e[1] - TIP_B0[1], e[2] - TIP_B0[2])
      } else if (frame !== 'identity') A = partFrame(frame, s, u)
      propInv = M4.inv(M4.mul(W, A))
      k =
        frame === 'hat'
          ? u.uCrown[2]
          : frame === 'helmet'
            ? u.uHelmet[2]
            : frame === 'wear'
              ? u.uWear[2]
              : 1
    }
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LESS)
    gl.depthMask(true)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.disable(gl.BLEND)
    gl.viewport(0, 0, px, px)
    gl.clearColor(0, 0, 0, 0)
    gl.clearDepth(1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    const g = faceGroup(u.uFaceMode)
    if (!S.body[g]) S.body[g] = link(S.vsBody, S.bodyFs(g))
    const B =
      (par || performance.now() - S.body[g].t0 > 150) && ready(S.body[g]) ? S.body[g] : S.body[0]
    gl.useProgram(B.p)
    setUniforms(gl, B.U, u)
    const body = M.body
    const tip = u.uTip
    const snap = Math.abs(tip[0]) + Math.abs(tip[1]) + Math.abs(tip[2] - 1) > 1e-4 ? 1 : 0
    setUniforms(gl, B.U, {
      uVP: cam.vp,
      uModel: bodyModel,
      uNrmM: bodyNrm,
      uCam: cam.ro,
      uMatId: 1,
      uPosLo: body.lo,
      uPosExt: body.ext,
    })
    gl.uniform1i(B.U.uSnap, snap)
    bindShadow(B.U, bv, pv, T, propInv, k)
    gl.bindVertexArray(body.vao)
    gl.drawElements(gl.TRIANGLES, body.icount, body.type, 0)

    if (props) {
      const Q = S.prop
      gl.useProgram(Q.p)
      setUniforms(gl, Q.U, u)
      bindShadow(Q.U, bv, pv, T, propInv, k)
      gl.uniform1i(Q.U.uLit, 1)
      for (const part of props) {
        if ((part.small && !u.uSmall) || (part.big && u.uSmall)) continue
        if (partHidden(part, u)) continue
        const A = partFrame(part.frame, s, u)
        const Wp = part.mat === 23 || part.mat === 43 || part.mat >= 55 ? bodyModel : W
        setUniforms(gl, Q.U, {
          uVP: cam.vp,
          uModel: Wp,
          uAttach: A,
          uNrmM: M4.normal(M4.mul(Wp, A)),
          uCam: cam.ro,
          uMatId: part.mat,
          uPosLo: part.lo,
          uPosExt: part.ext,
        })
        gl.bindVertexArray(part.vao)
        gl.drawElements(gl.TRIANGLES, part.icount, part.type, 0)
      }
      if (v === 2 && !u.uSmall) {
        updateChain(u)
        setUniforms(gl, Q.U, {
          uModel: W,
          uAttach: M4.id(),
          uNrmM: M4.normal(W),
          uMatId: 3,
          uPosLo: [0, 0, 0],
          uPosExt: [1, 1, 1],
        })
        gl.uniform1i(Q.U.uLit, 0)
        gl.bindVertexArray(S.chain.vao)
        gl.disable(gl.CULL_FACE)
        gl.drawElements(gl.TRIANGLES, S.chain.count, gl.UNSIGNED_SHORT, 0)
        gl.enable(gl.CULL_FACE)
      }
    }

    const G = S.ground
    gl.useProgram(G.p)
    setUniforms(gl, G.U, u)
    setUniforms(gl, G.U, { uVP: cam.vp })
    gl.depthMask(false)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.bindVertexArray(S.groundVAO)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.depthMask(true)
    gl.bindVertexArray(null)
  }

  function draw(target, px, state) {
    if (info.lost || gl.isContextLost()) {
      info.lost = true
      return canvas
    }
    const s = { outfit: 0, look: [0, 0], ...state }
    isReady(s.outfit)
    if (!P_READY() || !S.mesh) return null
    px = Math.max(1, Math.round(px))
    if (!target) {
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px
        canvas.height = px
      }
      prepare(s, px)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      render(px, s)
      S.last = s
      scheduleWarm()
      return canvas
    }
    const F = renderOffscreen(px, s)
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.rs)
    gl.readPixels(0, 0, px, px, gl.RGBA, gl.UNSIGNED_BYTE, F.pixels)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return paintTarget(target, px, F.pixels)
  }
  function renderOffscreen(px, s) {
    const F = ensureFbo(px)
    prepare(s, px)
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.ms)
    render(px, s)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, F.ms)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, F.rs)
    gl.blitFramebuffer(0, 0, px, px, 0, 0, px, px, gl.COLOR_BUFFER_BIT, gl.NEAREST)
    return F
  }
  function drawAsync(target, px, state) {
    if (info.lost || gl.isContextLost()) return Promise.resolve(null)
    const s = { outfit: 0, look: [0, 0], ...state }
    if (!isReady(s.outfit)) return Promise.resolve(null)
    px = Math.max(1, Math.round(px))
    const F = renderOffscreen(px, s)
    gl.bindFramebuffer(gl.FRAMEBUFFER, F.rs)
    const pbo = gl.createBuffer()
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo)
    gl.bufferData(gl.PIXEL_PACK_BUFFER, px * px * 4, gl.STREAM_READ)
    gl.readPixels(0, 0, px, px, gl.RGBA, gl.UNSIGNED_BYTE, 0)
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)
    gl.flush()
    return new Promise(resolve => {
      const poll = () => {
        if (info.lost || gl.isContextLost()) {
          resolve(null)
          return
        }
        if (gl.clientWaitSync(sync, 0, 0) === gl.TIMEOUT_EXPIRED) {
          setTimeout(poll, 8)
          return
        }
        gl.deleteSync(sync)
        const data = new Uint8Array(px * px * 4)
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo)
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, data)
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
        gl.deleteBuffer(pbo)
        resolve(paintTarget(target, px, data))
      }
      setTimeout(poll, 8)
    })
  }
  function paintTarget(target, px, src) {
    const img = new ImageData(px, px)
    const dst = img.data,
      row = px * 4
    for (let y = 0; y < px; y++) {
      const si = (px - 1 - y) * row,
        di = y * row
      for (let x = 0; x < row; x += 4) {
        const a = src[si + x + 3]
        if (!a) continue
        const m = 255 / a
        dst[di + x] = Math.min(255, src[si + x] * m)
        dst[di + x + 1] = Math.min(255, src[si + x + 1] * m)
        dst[di + x + 2] = Math.min(255, src[si + x + 2] * m)
        dst[di + x + 3] = a
      }
    }
    const ctx = target.getContext('2d')
    if (target.width === px && target.height === px) ctx.putImageData(img, 0, 0)
    else {
      const tmp = document.createElement('canvas')
      tmp.width = tmp.height = px
      tmp.getContext('2d').putImageData(img, 0, 0)
      ctx.clearRect(0, 0, target.width, target.height)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(tmp, 0, 0, target.width, target.height)
    }
    return target
  }
  function scheduleWarm() {
    if (S.warmTimer || S.warmDone) return
    const idle = window.requestIdleCallback || (f => setTimeout(f, 120))
    S.warmTimer = idle(runWarm, { timeout: 800 })
  }
  function warmTask() {
    const M = S.last && S.mesh
    if (!M) return null
    for (const g of FACE_GROUPS) {
      const b = S.body[g]
      if (b && b.U && !b.warm) return { prog: b, state: { ...S.last, face: g } }
    }
    if (propsReady())
      for (const v of VARS)
        if (M.props[v] && !M.props[v].warm)
          return {
            prog: M.props[v],
            state: { ...S.last, outfit: OUTFIT_OF_VARIANT[v], small: 0, fall: 0 },
          }
    return null
  }
  function runWarm() {
    S.warmTimer = null
    if (info.lost) return
    const t = warmTask()
    if (!t) {
      if (
        S.allStarted &&
        FACE_GROUPS.every(g => S.body[g] && S.body[g].warm) &&
        VARS.every(v => S.mesh.props[v])
      )
        S.warmDone = true
      return
    }
    if (!S.warmFb) {
      const fb = gl.createFramebuffer(),
        c = gl.createRenderbuffer(),
        d = gl.createRenderbuffer()
      gl.bindRenderbuffer(gl.RENDERBUFFER, c)
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, 4, 4)
      gl.bindRenderbuffer(gl.RENDERBUFFER, d)
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, 4, 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, c)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d)
      S.warmFb = fb
    }
    prepare(t.state, 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, S.warmFb)
    render(4, t.state)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    t.prog.warm = true
    info.warmed = (info.warmed || 0) + 1
    scheduleWarm()
  }
  function prepare(s, px) {
    const u = uniformsFor(s, px)
    u.uTipMid = tipMid(u.uTip)
    u.uTipEnd = tipEnd(u.uTip)
    bodyVolume(s, u)
    const v = variantOf(s.outfit)
    if (v > 0 && v !== 2 && v !== 6 && v !== 17 && propsReady()) propVolume(v)
  }

  setup()
  canvas.addEventListener('webglcontextrestored', () => {
    setup()
    info.lost = false
  })
  const faceReady = m => {
    if (!S || info.lost) return false
    const g = faceGroup(m),
      b = S.body[g]
    if (!b) {
      S.body[g] = link(S.vsBody, S.bodyFs(g))
      return false
    }
    return (par || performance.now() - b.t0 > 150) && ready(b)
  }
  return { draw, drawAsync, canvas, gl, info, isReady, faceReady, preload: () => S && loadMesh() }
}
