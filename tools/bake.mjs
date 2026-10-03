import { BASE, launch } from './browser.mjs'
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '..', 'mesh')
const bodyH = +(process.argv[2] || 0.028)
mkdirSync(OUT, { recursive: true })
await MeshoptSimplifier.ready
await MeshoptEncoder.ready
MeshoptSimplifier.useExperimentalFeatures = true
const SIMPLIFY_ERR = {
  hat: 0.0009,
  helmet: 0.0006,
  mono: 0.0003,
  monoSmall: 0.0004,
  penBody: 0.0004,
  penWood: 0.0004,
  penFerrule: 0.0004,
  penEraser: 0.0004,
  phonesBand: 0.0008,
  phonesCups: 0.0008,
  phonesPads: 0.0008,
  glasses: 0.0004,
  leaf1: 0.0004,
  leaf2: 0.0004,
  stem: 0.0003,
  beret: 0.0012,
  clapBoard: 0.0006,
  clapSticks: 0.0006,
  sweatband: 0.0015,
  gogStrap: 0.0015,
  gogCups: 0.001,
  gogLens: 0.0008,
  gogLeather: 0.001,
  snout: 0.0005,
  pigEars: 0.0008,
  pigCoin: 0.0004,
  setBand: 0.0012,
  setBoom: 0.0006,
  setFoam: 0.0006,
  skipBand: 0.0022,
  skipTop: 0.0022,
  skipPeak: 0.0012,
  skipBadge: 0.0006,
  skipBraid: 0.0009,
  mirBand: 0.002,
  mirDisc: 0.0008,
  mirRim: 0.0008,
  signPole: 0.0004,
  signPlate: 0.0004,
  signMark: 0.0003,
  antL: 0.0003,
  antR: 0.0003,
  leg0: 0.0004,
  leg1: 0.0004,
  leg2: 0.0004,
  leg3: 0.0004,
  leg4: 0.0004,
  leg5: 0.0004,
}
const LOD_ERR = +(process.env.LOD_ERR || 0.01)
const LOD_BODY = +(process.env.LOD_BODY || 0.2),
  LOD_PROP = +(process.env.LOD_PROP || 0.35),
  LOD_BODY2 = +(process.env.LOD_BODY2 || 0.1)
function optimize(name, pos, nrm, idx, lod = false) {
  let I = idx
  const simp = (target, e) =>
    MeshoptSimplifier.simplifyWithAttributes(
      idx,
      pos,
      3,
      nrm,
      3,
      [0.5, 0.5, 0.5],
      null,
      target,
      e,
      ['ErrorAbsolute'],
    )[0]
  const err = SIMPLIFY_ERR[name]
  if (err) I = simp(0, err)
  if (lod)
    I = simp(
      Math.floor((I.length * (lod === 2 ? LOD_BODY2 : name === 'body' ? LOD_BODY : LOD_PROP)) / 3) *
        3,
      LOD_ERR,
    )
  I = Uint32Array.from(I)
  const [remap, unique] = MeshoptEncoder.reorderMesh(I, true, false)
  const P = new Float32Array(unique * 3),
    N = new Float32Array(unique * 3)
  for (let v = 0; v < remap.length; v++) {
    const r = remap[v]
    if (r === 0xffffffff) continue
    P.set(pos.subarray(v * 3, v * 3 + 3), r * 3)
    N.set(nrm.subarray(v * 3, v * 3 + 3), r * 3)
  }
  return { pos: P, nrm: N, idx: I }
}

const browser = await launch()
const page = await browser.newPage()
page.on('pageerror', e => console.error('page error:', e.message))
page.on('console', m => {
  if (m.type() === 'error') console.error('console:', m.text())
})
await page.goto(`${BASE}/tools/bake.html`)
await page.waitForFunction(() => window.bakeReady, null, { timeout: 60000 })

const res = await page.evaluate(h => {
  const b64 = a => {
    const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
    let s = ''
    for (let i = 0; i < u.length; i += 32768)
      s += String.fromCharCode.apply(null, u.subarray(i, i + 32768))
    return btoa(s)
  }
  const r = window.bake(h)
  return {
    ms: r.ms,
    log: r.log,
    parts: r.parts.map(p => ({
      name: p.name,
      mat: p.mat,
      v: p.v,
      frame: p.frame,
      small: p.small,
      big: p.big,
      pos: b64(p.pos),
      nrm: b64(p.nrm),
      idx: b64(p.idx),
    })),
  }
}, bodyH)
const files = {}
const fileOf = p => (p.v < 0 ? 'body' : 'v' + p.v)
const push = (file, buf) => {
  const f = files[file] || (files[file] = { chunks: [], off: 0 })
  const pad = (4 - (buf.length % 4)) % 4,
    at = f.off
  f.chunks.push(buf, Buffer.alloc(pad))
  f.off += buf.length + pad
  return [at, buf.length]
}
const parts = []
const stats = []
const jobs = res.parts.flatMap(p => [
  { p, lod: 0 },
  { p, lod: 1 },
  ...(p.name === 'body' ? [{ p, lod: 2 }] : []),
])
for (const { p, lod } of jobs) {
  const raw = optimize(
    p.name,
    new Float32Array(new Uint8Array(Buffer.from(p.pos, 'base64')).buffer),
    new Float32Array(new Uint8Array(Buffer.from(p.nrm, 'base64')).buffer),
    new Uint32Array(new Uint8Array(Buffer.from(p.idx, 'base64')).buffer),
    lod,
  )
  const pos = raw.pos,
    nrm = raw.nrm,
    idx32 = raw.idx
  stats.push(`${lod ? 'lod' + lod + '.' : ''}${p.name}:${pos.length / 3}`)
  const vcount = pos.length / 3
  const body = p.name === 'body'
  const bits = body ? 11 : 14,
    top = (1 << bits) - 1
  let lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < vcount; i++)
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], pos[i * 3 + k])
      hi[k] = Math.max(hi[k], pos[i * 3 + k])
    }
  const q = new Uint16Array(vcount * 4)
  for (let i = 0; i < vcount; i++)
    for (let k = 0; k < 3; k++)
      q[i * 4 + k] = Math.round(((pos[i * 3 + k] - lo[k]) / (hi[k] - lo[k] || 1)) * top)
  const n4 = new Float32Array(vcount * 4)
  for (let i = 0; i < vcount; i++) n4.set(nrm.subarray(i * 3, i * 3 + 3), i * 4)
  const small16 = vcount < 65536
  const idx = small16 ? Uint16Array.from(idx32) : idx32
  const file = lod ? 'lod' : fileOf(p)
  const encP = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(q.buffer), vcount, 8)
  const encN = body
    ? null
    : MeshoptEncoder.encodeVertexBuffer(MeshoptEncoder.encodeFilterOct(n4, vcount, 4, 8), vcount, 4)
  const encI = MeshoptEncoder.encodeIndexBuffer(
    new Uint8Array(idx.buffer, idx.byteOffset, idx.byteLength),
    idx.length,
    small16 ? 2 : 4,
  )
  parts.push({
    name: lod === 2 ? 'body2' : p.name,
    mat: p.mat,
    v: p.v,
    frame: p.frame,
    small: p.small,
    big: p.big,
    lod: lod > 0,
    vcount,
    icount: idx.length,
    idx32: !small16,
    lo,
    hi: hi.map((h, k) => lo[k] + ((h - lo[k]) * 65535) / top),
    snap: body,
    file,
    pos: push(file, Buffer.from(encP)),
    nrm: encN ? push(file, Buffer.from(encN)) : null,
    idx: push(file, Buffer.from(encI)),
  })
}
const sizes = {}
for (const [file, f] of Object.entries(files)) {
  writeFileSync(join(OUT, `momo.${file}.bin`), Buffer.concat(f.chunks))
  sizes[file] = f.off
}
writeFileSync(join(OUT, 'momo.json'), JSON.stringify({ sizes, parts }))
console.log(
  `momo: ${res.ms} ms, KB per file ${JSON.stringify(Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, +(v / 1024).toFixed(1)])))}, verts: ${stats.join(' ')}`,
)
for (const l of res.log)
  console.log(
    `  ${l.name.padEnd(11)} v ${String(l.verts).padStart(6)} t ${String(l.tris).padStart(6)} grid ${l.grid.join('x')} boundaryMin ${l.bmin.toFixed(3)} resid ${l.resid.toExponential(1)}`,
  )
await browser.close()
