import {
  HEAD,
  GROUND_C,
  LIB,
  BODY,
  PROPS,
  MAP,
  LIB2,
  FACE as FACE_SRC,
  SHADE,
  GSHADOW,
  RENDER,
} from './shaders.js'
import { VARIANT, variantOf, uniformsFor, setUniforms } from './character.js'

export { PALETTES, OUTFITS, FACE, hexToRgb } from './character.js'

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG_BODY = /* @__PURE__ */ [
  HEAD,
  GROUND_C,
  LIB,
  BODY,
  PROPS,
  MAP,
  LIB2,
  FACE_SRC,
  SHADE,
  GSHADOW,
  RENDER,
].join('')

const NVAR = Math.max(...Object.values(VARIANT))
const VARS = Array.from({ length: NVAR }, (_, i) => i + 1)

export function createRenderer() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  })
  if (!gl) throw new Error('WebGL2 unavailable')
  const info = {
    lost: false,
    gpu: 'unknown',
    software: false,
    compileMs: 0,
    parallel: false,
    ready: [],
  }
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  if (dbg) info.gpu = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'unknown'
  info.software = /swiftshader|basic render|llvmpipe|software/i.test(info.gpu)
  const par = gl.getExtension('KHR_parallel_shader_compile')
  info.parallel = !!par
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault()
    info.lost = true
  })
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const t0 = performance.now()
  const nonce =
    typeof location !== 'undefined' && new URLSearchParams(location.search).get('cold')
      ? '// ' + Math.random() + '\n'
      : ''
  let progs = {}
  function start(v) {
    const mk = (type, src) => {
      const x = gl.createShader(type)
      gl.shaderSource(x, src)
      gl.compileShader(x)
      return x
    }
    const vs = mk(gl.VERTEX_SHADER, VERT),
      fs = mk(gl.FRAGMENT_SHADER, '#version 300 es\n#define PROP ' + v + '\n' + nonce + FRAG_BODY)
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'p')
    gl.linkProgram(prog)
    progs[v] = { prog, vs, fs, ready: false, U: null }
  }
  function ready(v) {
    const P = progs[v]
    if (!P) return false
    if (P.ready) return true
    if (par && !gl.getProgramParameter(P.prog, par.COMPLETION_STATUS_KHR)) return false
    if (!gl.getProgramParameter(P.prog, gl.LINK_STATUS))
      throw new Error((gl.getShaderInfoLog(P.fs) || '') + (gl.getProgramInfoLog(P.prog) || ''))
    P.U = {}
    const n = gl.getProgramParameter(P.prog, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < n; i++) {
      const u = gl.getActiveUniform(P.prog, i)
      P.U[u.name] = gl.getUniformLocation(P.prog, u.name)
    }
    P.ready = true
    info.ready.push(v)
    if (v === 0) {
      info.compileMs = Math.round(performance.now() - t0)
      for (const w of VARS) if (!progs[w]) start(w)
    }
    return true
  }
  function startAll() {
    progs = {}
    start(0)
    if (!par) for (const v of VARS) start(v)
  }
  startAll()
  canvas.addEventListener('webglcontextrestored', () => {
    gl.bindVertexArray(gl.createVertexArray())
    startAll()
    info.lost = false
  })
  function draw(target, px, state) {
    if (info.lost || gl.isContextLost()) {
      info.lost = true
      return canvas
    }
    const want = variantOf(state.outfit ?? 0)
    const v = ready(want) ? want : ready(0) ? 0 : -1
    if (v < 0) return null
    gl.useProgram(progs[v].prog)
    if (canvas.width !== px || canvas.height !== px) {
      canvas.width = px
      canvas.height = px
    }
    gl.viewport(0, 0, px, px)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    setUniforms(gl, progs[v].U, uniformsFor(state, px))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    if (target) {
      const ctx = target.getContext('2d')
      ctx.clearRect(0, 0, target.width, target.height)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(canvas, 0, 0, target.width, target.height)
    }
    return canvas
  }
  const isReady = outfit => ready(variantOf(outfit))
  return { draw, canvas, gl, info, isReady }
}
