import { launch } from '../tools/browser.mjs'
import { isolatedEnv, startServer, report } from './harness.mjs'

const server = await startServer('dev', 5398, isolatedEnv())
const browser = await launch()
const page = await browser.newPage()
const { check, finish } = report()
await page.goto(`${server.url}/test/blank.html`)

const failures = await page.evaluate(async () => {
  const shaders = await import('../src/engine/shaders.js')
  const { SHADER_SRC } = await import('../src/engine/mesh.js')
  const { VARIANT } = await import('../src/engine/character.js')
  const gl = document.createElement('canvas').getContext('webgl2')
  const failed = []
  const compile = (name, type, src) => {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      failed.push(`${name}: ${gl.getShaderInfoLog(shader).slice(0, 600)}`)
  }

  const { HEAD, GROUND_C, LIB, BODY, PROPS, MAP, LIB2, FACE, SHADE, GSHADOW, RENDER } = shaders
  const raymarch = [HEAD, GROUND_C, LIB, BODY, PROPS, MAP, LIB2, FACE, SHADE, GSHADOW, RENDER].join(
    '',
  )
  const variants = Math.max(...Object.values(VARIANT))
  for (let v = 0; v <= variants; v++)
    compile(
      `raymarch prop ${v}`,
      gl.FRAGMENT_SHADER,
      `#version 300 es\n#define PROP ${v}\n${raymarch}`,
    )

  const M = SHADER_SRC()
  const mesh = defines => M.PRE + defines.map(d => `#define ${d}\n`).join('') + M.FS_MAIN
  compile('mesh props', gl.FRAGMENT_SHADER, mesh(['PROP 0', 'MESH', 'ALLMATS', 'FACE_ONLY -1']))
  for (const face of [0, 1, 2, 4, 5, 6, 7, 8, 9, 10])
    compile(`mesh face ${face}`, gl.FRAGMENT_SHADER, mesh(['PROP 0', 'MESH', `FACE_ONLY ${face}`]))
  compile('mesh volume', gl.FRAGMENT_SHADER, M.PRE + M.FS_VOL)
  compile('mesh body vertex', gl.VERTEX_SHADER, M.PRE + M.VS_BODY)
  compile('mesh prop vertex', gl.VERTEX_SHADER, M.PRE + M.VS_PROP)
  return failed
})

check('every shader compiles', failures.length === 0, failures)
await browser.close()
server.stop()
finish()
