import { SHADOW } from './character.js'
import { ANTENNA, BUG_SPOTS, BUG_SEAM, BUG_LEG, BUG_LEGS, LEG_GROW } from './rig.js'

const g3 = v =>
  `vec3(${v
    .slice(0, 3)
    .map(n => n.toFixed(3))
    .join(', ')})`
const ANT = ANTENNA.stalk
const ANT_STALK = ANT.slice(1)
  .map(
    (b, i) =>
      `  d = min(d, sdRoundCone(c, ${g3(ANT[i])}, ${g3(b)}, ${ANT[i][3].toFixed(4)}, ${b[3].toFixed(4)}));`,
  )
  .join('\n')
const LEGS = BUG_LEGS.map(
  (L, i) =>
    `  l = min(l, legD(p, ${g3(L.root)}, ${g3(L.x)}, ${g3(L.z)}, ${i < 3 ? 'uLegL' : 'uLegR'}.${'xyz'[i % 3]}, legGrow(${L.k.toFixed(1)})));`,
).join('\n')

export const HEAD = `precision highp float;
out vec4 outColor;
uniform vec2 uRes;
uniform float uTime;
uniform int uOutfit;
uniform float uYaw, uSquash, uBlink, uDead, uSmall, uFuzz, uLift;
uniform vec2 uLook;
uniform vec3 cLight, cBase, cShade, cDeep;
uniform vec3 uEyeL, uEyeR, uCrown;
uniform vec3 uPenC, uPenD;
uniform float uEyeRX, uEyeRY;
uniform float uRoll, uHatTilt, uBrowOn;
uniform vec4 uBrows;
uniform vec2 uEyeScale;
uniform vec2 uFoot;
uniform vec2 uLids;
uniform float uPeek;
uniform vec3 uMonoN, uChainEnd, uEyeLN;
uniform vec3 uTip;
uniform float uFall, uGlassY, uLeaf;
uniform int uFaceMode;
uniform vec3 uAnchor, uLand;
uniform vec2 uFallRot;
uniform vec3 uHelmet;
uniform vec3 uWear;
uniform float uPixW;
uniform float uGlow;
uniform float uRestMouth;
uniform float uSmile;
uniform float uSleepy;
uniform float uWink;
uniform float uDarkFloor;
uniform float uBug;
uniform vec3 uAnt;
uniform vec3 uLegL, uLegR;

`

export const GROUND_C = `const float GROUND = -0.92;

`

export const LIB = `
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}
float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}
float sdEll(vec3 p, vec3 r) {
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0-1.0)/k1;
}
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a;
  float l2 = dot(ba,ba);
  float rr = r1 - r2;
  float a2 = l2 - rr*rr;
  float il2 = 1.0/l2;
  vec3 pa = p - a;
  float y = dot(pa,ba);
  float z = y - l2;
  vec3 xv = pa*l2 - ba*y;
  float x2 = dot(xv,xv);
  float y2 = y*y*l2;
  float z2 = z*z*l2;
  float k = sign(rr)*rr*rr*x2;
  if (sign(z)*a2*z2 > k) return sqrt(x2 + z2)*il2 - r2;
  if (sign(y)*a2*y2 < k) return sqrt(x2 + y2)*il2 - r1;
  return (sqrt(x2*a2*il2) + y*rr)*il2 - r1;
}
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xy) - t.x, p.z);
  return length(q) - t.y;
}
float sdCyl(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.yz), p.x)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdHex(vec3 p, float r, float h){
  const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
  vec3 q = vec3(p.y, p.z, p.x);
  q = abs(q);
  q.xy -= 2.0*min(dot(k.xy, q.xy), 0.0)*k.xy;
  vec2 d = vec2(length(q.xy - vec2(clamp(q.x, -k.z*r, k.z*r), r))*sign(q.y - r), q.z - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdCone(vec3 p, float h, float r1, float r2){
  vec2 q = vec2(length(p.yz), p.x);
  vec2 k1 = vec2(r2, h);
  vec2 k2 = vec2(r2 - r1, 2.0*h);
  vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);
  vec2 cb = q - k1 + k2*clamp(dot(k1 - q, k2)/dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s*sqrt(min(dot(ca, ca), dot(cb, cb)));
}
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

vec3 wearQ(vec3 p, float tilt){
  vec3 q = (p - vec3(uWear.xy, 0.0))/uWear.z;
  q.xy = rot(tilt + uHatTilt*0.6)*q.xy;
  return q;
}
vec3 clapArm(vec3 q) {
  vec3 a = q - vec3(-0.42, 0.53, 0.0);
  a.xy = rot(0.42)*a.xy;
  return a - vec3(0.42, 0.05, 0.0);
}
vec3 gogAxis(float sx) {
  return normalize(vec3(0.36*sx, 0.42, 0.9));
}
vec3 gogC(float sx) {
  return vec3(0.28*sx, 0.06, 0.6) + gogAxis(sx)*0.05;
}
float hatFold(vec3 q){
  float r = length(q.xz), ang = atan(q.z, q.x);
  return cos(ang*8.0 + 0.6)*smoothstep(0.04, 0.3, r)*smoothstep(0.3, 0.42, q.y);
}
float dollar(vec2 f, float s){
  f /= s;
  float s1 = abs(length(f - vec2(0.0, 0.07)) - 0.07) - 0.024;
  s1 = (f.x > 0.0 && f.y < 0.07) ? 1.0 : s1;
  float s2 = abs(length(f - vec2(0.0, -0.07)) - 0.07) - 0.024;
  s2 = (f.x < 0.0 && f.y > -0.07) ? 1.0 : s2;
  float bar = max(abs(f.x) - 0.018, abs(f.y) - 0.2);
  return min(min(s1, s2), bar)*s;
}
vec3 faceC() {
  return vec3((uEyeL.x + uEyeR.x)*0.5 + uLook.x, (uEyeL.y + uEyeR.y)*0.5 + uLook.y, max(uEyeL.z, uEyeR.z));
}
vec3 snoutC() {
  return faceC() + vec3(0.03, -0.24, 0.0);
}
vec3 snoutQ(vec3 p) {
  vec3 s = p - snoutC();
  s.yz = rot(-0.12)*s.yz;
  return s;
}
vec3 pigCoinQ(vec3 w) {
  vec3 c = w - vec3(0.05, 0.07, 0.0);
  c.xy = rot(0.18)*c.xy;
  return c;
}
vec3 gogQ(vec3 q, float sx){
  vec3 n = gogAxis(sx), x = normalize(cross(vec3(0.0, 1.0, 0.0), n)), y = cross(n, x);
  vec3 d = q - gogC(sx);
  return vec3(dot(d, x), dot(d, y), dot(d, n));
}
`

export const BODY = `vec3 toObject(vec3 p){
  p.y -= uLift;
  p.xz = rot(uYaw)*p.xz;
  p.y -= GROUND;
  p.xy = rot(-0.16*uDead - uRoll)*p.xy;
  p.y += GROUND;
  float sy = 1.0 - 0.09*uSquash - 0.36*uDead;
  float sx = 1.0 + 0.05*uSquash + 0.18*uDead;
  p.y = (p.y - GROUND)/sy + GROUND;
  p.xz /= sx;
  return p;
}
const vec3 TIP_A = vec3(0.0, 0.02, 0.0);
const vec3 TIP_B0 = vec3(0.24, 0.98, -0.04);
vec3 tipDir(float amt){
  vec3 d = normalize(TIP_B0 - TIP_A);
  d.xy = rot(uTip.x*amt)*d.xy;
  d.yz = rot(-uTip.y*amt)*d.yz;
  return d;
}
#ifdef TIP_UNIFORMS
uniform vec3 uTipMid, uTipEnd;
vec3 tipMid() {
  return uTipMid;
}
vec3 tipEnd() {
  return uTipEnd;
}
#else
vec3 tipMid() {
  return TIP_A + tipDir(0.5)*length(TIP_B0 - TIP_A)*0.5*uTip.z;
}
vec3 tipEnd() {
  return tipMid() + tipDir(1.0)*length(TIP_B0 - TIP_A)*0.5*uTip.z;
}
#endif
float bodyD(vec3 p){
  vec3 tm = tipMid(), tb = tipEnd();
  float tip = smin(sdRoundCone(p, TIP_A, tm, 0.6, 0.31), sdRoundCone(p, tm, tb, 0.31, 0.085), 0.05);
  float d = smin(sdEll(p - vec3(0.0, -0.2, 0.0), vec3(0.98, 0.74, 0.9)), tip, 0.36);
  return smax(d, -(p.y - GROUND), 0.16);
}

vec2 crownXY() {
  return uCrown.xy + (tipEnd() - TIP_B0).xy*0.2;
}
float crownTilt() {
  return -uTip.x*0.25;
}
`

export const PROPS = `float hatLocal(vec3 q){
  float r = length(q.xz);
  float band = max(r - (0.335 + 0.03*clamp(q.y/0.3, 0.0, 1.0)), abs(q.y - 0.15) - 0.15);
  float hem = length(vec2(r - 0.335, q.y - 0.02)) - 0.03;
  float puff = sdEll(q - vec3(0.02, 0.5, 0.0), vec3(0.47, 0.25, 0.45));
  puff -= 0.03*hatFold(q);
  puff += 0.035*(1.0 - smoothstep(0.0, 0.12, r))*smoothstep(0.6, 0.72, q.y);
  return smin(smin(band, hem, 0.02), puff, 0.06);
}
vec2 hat(vec3 p){
  vec3 q = (p - vec3(crownXY(), 0.0))/uCrown.z;
  q.xy = rot(uHatTilt + crownTilt())*q.xy;
  return vec2(hatLocal(q)*uCrown.z, 2.0);
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  return length(pa - ba*clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0)) - r;
}
vec2 monocle(vec3 p){
  vec3 n = normalize(uMonoN);
  vec3 c = uEyeR + vec3(uLook + vec2(-0.03, -0.05), 0.0) + n*0.028;
  vec3 x = normalize(cross(vec3(0.0, 1.0, 0.0), n)), y = cross(n, x);
  vec3 q = p - c;
  q = vec3(dot(q, x), dot(q, y), dot(q, n));
  float d = sdTorus(q, vec2(0.182, uSmall > 0.5 ? 0.03 : 0.019));
  if (uSmall < 0.5) {
    vec3 a = c + (x*0.707 - y*0.707)*0.182;
    vec3 b = uChainEnd;
    vec3 m = mix(a, b, 0.5) + vec3(0.0, -0.13, 0.06);
    vec3 prev = a;
    float ch = 1e9;
    for (int i = 1; i <= 6; i++) {
      float t = float(i)/6.0;
      vec3 cp = mix(mix(a, m, t), mix(m, b, t), t);
      ch = min(ch, sdCapsule(p, prev, cp, 0.012));
      prev = cp;
    }
    d = min(d, ch);
  }
  return vec2(d, 3.0);
}

float pencilPart(vec3 q, float r, int i){
  if (i == 0) return sdHex(q - vec3(-0.02, 0.0, 0.0), r, 0.5);
  if (i == 1) return sdCone(q - vec3(0.6, 0.0, 0.0), 0.12, r*0.98, 0.012);
  if (i == 2) return sdCyl(q - vec3(-0.585, 0.0, 0.0), r*1.06, 0.07);
  return sdCyl(q - vec3(-0.7, 0.0, 0.0), r*0.98, 0.05) - 0.02;
}
vec2 pencil(vec3 p){
  vec3 dx = normalize(uPenD);
  vec3 dy = normalize(cross(vec3(0.0, 0.0, 1.0), dx));
  vec3 dz = cross(dx, dy);
  vec3 q = p - uPenC;
  q = vec3(dot(q, dx), dot(q, dy), dot(q, dz));
  float r = uSmall > 0.5 ? 0.1 : 0.085;
  float body = pencilPart(q, r, 0);
  float wood = pencilPart(q, r, 1);
  float fer = pencilPart(q, r, 2);
  float era = pencilPart(q, r, 3);
  vec2 res = vec2(body, 5.0);
  if (wood < res.x) res = vec2(wood, 6.0);
  if (fer < res.x) res = vec2(fer, 8.0);
  if (era < res.x) res = vec2(era, 9.0);
  return res;
}


float helmetLocal(vec3 q){
  float dome = max(sdEll(q - vec3(0.0, 0.0, 0.0), vec3(0.62, 0.47, 0.6)), -q.y);
  vec3 b = q - vec3(0.0, 0.012, 0.07);
  vec2 bd = abs(vec2(length(b.xz*vec2(1.0, 0.94)), b.y)) - vec2(0.72, 0.012);
  float brim = min(max(bd.x, bd.y), 0.0) + length(max(bd, 0.0)) - 0.014;
  float ridge = max(sdEll(q - vec3(0.0, 0.3, 0.0), vec3(0.06, 0.17, 0.44)), -(q.y - 0.12));
  return smin(min(dome, brim), ridge, 0.03);
}
vec2 helmet(vec3 p){
  float k = uHelmet.z;
  vec3 q = (p - vec3(uHelmet.xy, 0.0))/k;
  q.xy = rot(0.06 + uHatTilt*0.6)*q.xy;
  return vec2(helmetLocal(q)*k, 10.0);
}
float phonesPart(vec3 p, int i){
  if (i == 0) {
    vec3 q = p - vec3(0.0, -0.02, -0.04);
    return max(length(vec2(length(q.xy) - 1.1, q.z)) - 0.06, -q.y);
  }
  if (i == 1) return min(sdCyl(p - vec3(-1.0, -0.02, -0.02), 0.23, 0.1), sdCyl(p - vec3(1.0, -0.02, -0.02), 0.23, 0.1)) - 0.035;
  return min(sdCyl(p - vec3(-0.9, -0.02, -0.02), 0.19, 0.03), sdCyl(p - vec3(0.9, -0.02, -0.02), 0.19, 0.03)) - 0.03;
}
vec2 phones(vec3 p){
  float band = phonesPart(p, 0);
  float cups = phonesPart(p, 1);
  vec2 res = vec2(min(band, cups), 11.0);
  float pad = phonesPart(p, 2);
  if (pad < res.x) res = vec2(pad, 12.0);
  return res;
}
vec2 glasses(vec3 p){
  vec3 nR = normalize(uMonoN), nL = normalize(uEyeLN);
  vec3 cR = uEyeR + vec3(-0.03, -0.07 - uGlassY, 0.0) + nR*0.085, cL = uEyeL + vec3(0.03, -0.07 - uGlassY, 0.0) + nL*0.085;
  vec3 xR = normalize(cross(vec3(0.0, 1.0, 0.0), nR)), yR = cross(nR, xR);
  vec3 xL = normalize(cross(vec3(0.0, 1.0, 0.0), nL)), yL = cross(nL, xL);
  vec3 qR = p - cR;
  qR = vec3(dot(qR, xR), dot(qR, yR), dot(qR, nR));
  vec3 qL = p - cL;
  qL = vec3(dot(qL, xL), dot(qL, yL), dot(qL, nL));
  const float RR = 0.2, TT = 0.028;
  float rings = min(sdTorus(qR, vec2(RR, TT)), sdTorus(qL, vec2(RR, TT)));
  vec3 bi = cL + xL*RR, bo = cR - xR*RR, bm = (bi + bo)*0.5 + vec3(0.0, 0.035, 0.012);
  float bridge = min(sdCapsule(p, bi, bm, 0.022), sdCapsule(p, bm, bo, 0.022));
  vec3 hR = cR + xR*RR, hL = cL - xL*RR;
  float arms = min(sdCapsule(p, hR, hR - nR*0.42 + xR*0.04, 0.02), sdCapsule(p, hL, hL - nL*0.42 - xL*0.04, 0.02));
  return vec2(min(min(rings, bridge), arms), 13.0);
}
vec2 leaves(vec3 p){
  vec3 tb = tipEnd();
  float perk = uLeaf;
  vec3 q1 = p - tb - vec3(-0.1, 0.04 + 0.03*perk, 0.0);
  q1.xy = rot(0.9 - 0.5*perk + uHatTilt)*q1.xy;
  vec3 q2 = p - tb - vec3(0.1, 0.05 + 0.03*perk, 0.02);
  q2.xy = rot(-0.8 + 0.5*perk + uHatTilt*1.3)*q2.xy;
  float l1 = sdEll(q1 - vec3(-0.13, 0.0, 0.0), vec3(0.15, 0.05, 0.08));
  float l2 = sdEll(q2 - vec3(0.14, 0.0, 0.0), vec3(0.16, 0.05, 0.085));
  float stem = sdCapsule(p, tb - vec3(0.0, 0.03, 0.0), tb + vec3(0.0, 0.06, 0.0), 0.018);
  return vec2(smin(min(l1, l2), stem, 0.03), 14.0);
}
float beretLocal(vec3 q){
  float cap = sdEll(q - vec3(0.14, 0.2, 0.0), vec3(0.86, 0.24, 0.8));
  cap = smin(cap, sdEll(q - vec3(0.02, 0.08, 0.0), vec3(0.7, 0.2, 0.66)), 0.12);
  cap = smin(cap, sdEll(q - vec3(0.08, 0.3, 0.0), vec3(0.56, 0.16, 0.54)), 0.12);
  float band = sdTorus(vec3(q.x, q.z, q.y - 0.02), vec2(0.66, 0.05));
  float stalk = sdCapsule(q, vec3(0.12, 0.42, 0.0), vec3(0.15, 0.56, 0.0), 0.038);
  return smin(smin(cap, band, 0.07), stalk, 0.04);
}
vec2 beret(vec3 p) {
  return vec2(beretLocal(wearQ(p, -0.22))*uWear.z, 16.0);
}
float sdRBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float clapPart(vec3 q, int i){
  if (i == 0) return sdRBox(q - vec3(0.0, 0.25, 0.0), vec3(0.42, 0.23, 0.04), 0.035);
  return min(sdRBox(q - vec3(0.0, 0.53, 0.0), vec3(0.42, 0.05, 0.04), 0.02), sdRBox(clapArm(q), vec3(0.42, 0.05, 0.04), 0.02));
}
vec2 clapper(vec3 p){
  vec3 q = wearQ(p, 0.16);
  float b = clapPart(q, 0), s = clapPart(q, 1);
  return (s < b ? vec2(s, 18.0) : vec2(b, 17.0))*vec2(uWear.z, 1.0);
}
float headRing(vec3 q, vec2 r, vec2 hs, float round){
  float k = length(q.xz/r);
  vec2 b = abs(vec2((k - 1.0)*min(r.x, r.y), q.y)) - hs + round;
  return length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - round;
}
float sweatLocal(vec3 q){
  vec2 r = vec2(0.86, 0.8) - vec2(0.85, 0.8)*q.y;
  float k = length(q.xz/r);
  vec2 b = abs(vec2((k - 1.0)*min(r.x, r.y)*0.76, q.y)) - vec2(0.05, 0.13) + 0.045;
  return (length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - 0.045)*0.9;
}
vec2 sweatband(vec3 p) {
  return vec2(sweatLocal(wearQ(p, 0.06))*uWear.z, 19.0);
}
float gogPart(vec3 q, int i){
  vec3 a = gogQ(q, 1.0), b = gogQ(q, -1.0);
  if (i == 0) {
    vec2 r = vec2(0.765, 0.705) - vec2(0.85, 0.8)*q.y;
    float k = length(q.xz/r);
    vec2 bb = abs(vec2((k - 1.0)*min(r.x, r.y)*0.76, q.y)) - vec2(0.02, 0.05) + 0.018;
    float strap = (length(max(bb, 0.0)) + min(max(bb.x, bb.y), 0.0) - 0.018)*0.9;
    strap = max(strap, -max(abs(q.x) - 0.3, -q.z));
    float bridge = sdCapsule(q, gogC(-1.0) + vec3(0.14, 0.0, 0.05), gogC(1.0) + vec3(-0.14, 0.0, 0.05), 0.034);
    return min(strap, bridge);
  }
  if (i == 1) {
    float ca = sdTorus(a - vec3(0.0, 0.0, 0.08), vec2(0.175, 0.036)), cb = sdTorus(b - vec3(0.0, 0.0, 0.08), vec2(0.175, 0.036));
    float ra = length(a - vec3(0.205, 0.0, 0.02)) - 0.03, rb = length(b - vec3(-0.205, 0.0, 0.02)) - 0.03;
    return min(min(ca, cb), min(ra, rb));
  }
  if (i == 2) return min(sdEll(a - vec3(0.0, 0.0, 0.075), vec3(0.15, 0.15, 0.05)), sdEll(b - vec3(0.0, 0.0, 0.075), vec3(0.15, 0.15, 0.05)));
  return min(sdCyl(vec3(a.z, a.x, a.y), 0.18, 0.06) - 0.03, sdCyl(vec3(b.z, b.x, b.y), 0.18, 0.06) - 0.03);
}
vec2 goggles(vec3 p){
  vec3 q = wearQ(p, 0.0);
  float s = gogPart(q, 0), c = gogPart(q, 1), l = gogPart(q, 2), k = gogPart(q, 3);
  vec2 r = vec2(s, 20.0);
  if (c < r.x) r = vec2(c, 21.0);
  if (l < r.x) r = vec2(l, 22.0);
  if (k < r.x) r = vec2(k, 26.0);
  return r*vec2(uWear.z, 1.0);
}
float snoutLocal(vec3 s) {
  return sdCyl(vec3(s.z - 0.02, s.x/1.28, s.y), 0.1, 0.045) - 0.045;
}
float pigEar(vec3 w, float sx){
  vec3 q = w - vec3(sx*0.42, -0.2, 0.1);
  q.x *= sx;
  q.xy = rot(0.62)*q.xy;
  q.yz = rot(-0.4)*q.yz;
  q.z *= 2.4;
  return sdRoundCone(q, vec3(0.0), vec3(0.0, 0.34, 0.0), 0.15, 0.035)/2.4;
}
float pigEars(vec3 w) {
  return min(pigEar(w, 1.0), pigEar(w, -1.0));
}
float pigCoinLocal(vec3 w) {
  vec3 c = pigCoinQ(w);
  return sdCyl(vec3(c.z, c.x, c.y), 0.19, 0.016) - 0.016;
}
vec2 piggy(vec3 p, vec3 pf){
  vec2 r = vec2(snoutLocal(snoutQ(p)), 23.0);
  float e = pigEars(wearQ(p, 0.0))*uWear.z;
  if (e < r.x) r = vec2(e, 43.0);
  float c = pigCoinLocal(wearQ(pf, 0.0))*uWear.z;
  if (c < r.x) r = vec2(c, 44.0);
  return r;
}
vec3 micPt(float t){
  vec3 a = vec3(-1.04, -0.12, 0.1), m = vec3(-0.98, -0.42, 0.74), b = vec3(-0.4, -0.38, 0.88);
  return mix(mix(a, m, t), mix(m, b, t), t);
}
float setPart(vec3 q, int i){
  if (i == 0) {
    vec3 h = q - vec3(0.0, -0.02, -0.08);
    float band = max(length(vec2(length(h.xy) - 1.1, h.z)) - 0.035, -h.y);
    float cup = sdCyl(q - vec3(-1.02, -0.04, -0.02), 0.2, 0.07) - 0.03;
    float knob = sdCyl(q - vec3(1.06, -0.04, -0.06), 0.1, 0.04) - 0.02;
    return min(band, min(cup, knob));
  }
  if (i == 1) {
    float d = 1e9;
    vec3 prev = micPt(0.0);
    for (int k = 1; k <= 6; k++) {
      vec3 c = micPt(float(k)/6.0);
      d = min(d, sdCapsule(q, prev, c, 0.024));
      prev = c;
    }
    return d;
  }
  return length(q - micPt(1.0) - vec3(0.04, 0.0, 0.02)) - 0.07;
}
vec2 headset(vec3 p){
  vec3 q = wearQ(p, 0.0);
  float a = setPart(q, 0), b = setPart(q, 1), c = setPart(q, 2);
  vec2 r = vec2(min(a, b), 24.0);
  if (c < r.x) r = vec2(c, 25.0);
  return r*vec2(uWear.z, 1.0);
}
float ellCyl(vec3 q, vec2 r, float h, float rnd){
  float k = length(q.xz/r);
  vec2 b = vec2((k - 1.0)*min(r.x, r.y), abs(q.y) - h) + rnd;
  return length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - rnd;
}
float skipperPart(vec3 q, int i){
  if (i == 0) return ellCyl(q - vec3(0.0, 0.13, 0.0), vec2(0.7, 0.66), 0.13, 0.03);
  if (i == 1) {
    float top = sdEll(q - vec3(0.0, 0.38, -0.03), vec3(0.8, 0.23, 0.78));
    return smin(top, ellCyl(q - vec3(0.0, 0.28, 0.0), vec2(0.69, 0.65), 0.05, 0.02), 0.1);
  }
  if (i == 2) {
    vec3 b = q - vec3(0.0, 0.03, 0.56);
    b.yz = rot(0.32)*b.yz;
    return max(sdEll(b - vec3(0.0, 0.0, 0.1), vec3(0.56, 0.03, 0.34)), 0.5 - q.z);
  }
  if (i == 3) {
    vec3 g = q - vec3(0.0, 0.17, 0.7);
    return sdCyl(vec3(g.z, g.x, g.y), 0.09, 0.016) - 0.014;
  }
  float cord = 1e9;
  for (int k = 0; k < 2; k++) {
    float y = 0.045 + 0.042*float(k);
    cord = min(cord, length(vec2((length(q.xz/vec2(0.715, 0.675)) - 1.0)*0.675, q.y - y)) - 0.017);
  }
  return max(cord, 0.36 - q.z);
}
vec2 skipper(vec3 p){
  vec3 q = wearQ(p, 0.06);
  vec2 r = vec2(skipperPart(q, 0), 46.0);
  float d = skipperPart(q, 1);
  if (d < r.x) r = vec2(d, 45.0);
  d = skipperPart(q, 2);
  if (d < r.x) r = vec2(d, 47.0);
  d = min(skipperPart(q, 3), skipperPart(q, 4));
  if (d < r.x) r = vec2(d, 48.0);
  return r*vec2(uWear.z, 1.0);
}
vec3 mirrorQ(vec3 q) {
  vec3 m = q - vec3(0.02, 0.16, 0.84);
  m.yz = rot(-0.42)*m.yz;
  return m;
}
float mirrorPart(vec3 q, int i){
  if (i == 0) {
    vec2 r = vec2(0.86, 0.8) - vec2(0.85, 0.8)*q.y;
    float k = length(q.xz/r);
    vec2 b = abs(vec2((k - 1.0)*min(r.x, r.y)*0.76, q.y)) - vec2(0.03, 0.06) + 0.02;
    float band = (length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - 0.02)*0.9;
    return min(band, sdCapsule(q, vec3(0.01, 0.0, 0.79), vec3(0.02, 0.12, 0.83), 0.035));
  }
  vec3 m = mirrorQ(q);
  if (i == 1) return max(sdCyl(vec3(m.z, m.x, m.y), 0.225, 0.014) - 0.006, 0.045 - length(m.xy));
  return sdTorus(m, vec2(0.232, 0.024));
}
vec2 headMirror(vec3 p){
  vec3 q = wearQ(p, 0.0);
  vec2 r = vec2(mirrorPart(q, 0), 49.0);
  float d = mirrorPart(q, 1);
  if (d < r.x) r = vec2(d, 50.0);
  d = mirrorPart(q, 2);
  if (d < r.x) r = vec2(d, 51.0);
  return r*vec2(uWear.z, 1.0);
}
float sdOct2(vec2 p, float r){
  const vec3 k = vec3(-0.9238795325, 0.3826834323, 0.4142135623);
  p = abs(p);
  p -= 2.0*min(dot(vec2(k.x, k.y), p), 0.0)*vec2(k.x, k.y);
  p -= 2.0*min(dot(vec2(-k.x, k.y), p), 0.0)*vec2(-k.x, k.y);
  p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
  return length(p)*sign(p.y);
}
float signPart(vec3 s, int i){
  if (i == 0) return sdCapsule(s, vec3(0.56, -0.89, -0.56), vec3(0.74, 0.98, -0.47), 0.03);
  vec3 c = s - vec3(0.74, 1.08, -0.45);
  c.xy = rot(-0.08)*c.xy;
  if (i == 1) {
    vec2 w = vec2(sdOct2(c.xy, 0.29) + 0.014, abs(c.z) - 0.012);
    return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - 0.014;
  }
  float mark = min(abs(sdOct2(c.xy, 0.245)) - 0.018, max(abs(c.x) - 0.16, abs(c.y) - 0.045));
  vec2 w = vec2(mark, abs(c.z - 0.03) - 0.008);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}
vec2 stopSign(vec3 p){
  vec3 s = wearQ(p, 0.0);
  vec2 r = vec2(signPart(s, 0), 52.0);
  float d = signPart(s, 1);
  if (d < r.x) r = vec2(d, 53.0);
  d = signPart(s, 2);
  if (d < r.x) r = vec2(d, 54.0);
  return r*vec2(uWear.z, 1.0);
}
float antPart(vec3 c){
  float d = 1e9;
${ANT_STALK}
  return smin(d, length(c - ${g3(ANTENNA.ball)}) - ${ANTENNA.ball[3].toFixed(3)}, 0.012);
}
float antD(vec3 p, int i){
  vec3 c = p - (i == 0 ? ${g3(ANTENNA.roots[0])} : ${g3(ANTENNA.roots[1])});
  c.xy = rot(i == 0 ? uAnt.y : uAnt.z)*c.xy;
  float g = max(uAnt.x, 1e-3);
  c /= g;
  if (i == 0) c.x = -c.x;
  return antPart(c)*g;
}
float legPart(vec3 c){
  float d = smin(sdRoundCone(c, vec3(0.0), ${g3(BUG_LEG.knee)}, ${BUG_LEG.hip.toFixed(3)}, ${BUG_LEG.knee[3].toFixed(3)}), sdRoundCone(c, ${g3(BUG_LEG.knee)}, ${g3(BUG_LEG.ankle)}, ${BUG_LEG.knee[3].toFixed(3)}, ${BUG_LEG.ankle[3].toFixed(3)}), 0.015);
  return smin(d, length(c - ${g3(BUG_LEG.foot)}) - ${BUG_LEG.foot[3].toFixed(3)}, 0.015);
}
float legGrow(float k){
  float t = clamp((uBug - ${LEG_GROW.at.toFixed(3)} - k*${LEG_GROW.step.toFixed(3)})/${LEG_GROW.len.toFixed(3)}, 0.0, 1.0) - 1.0;
  return 1.0 + 2.70158*t*t*t + 1.70158*t*t;
}
float legD(vec3 p, vec3 root, vec3 ax, vec3 az, float lift, float g){
  vec3 c = p - root;
  c = vec3(dot(c, ax), c.y, dot(c, az));
  c.xy = rot(lift)*c.xy;
  g = max(g, 1e-3);
  return legPart(c/g)*g;
}
vec2 bugParts(vec3 p){
  float d = min(antD(p, 0), antD(p, 1));
  float l = 1e9;
${LEGS}
  return d < l ? vec2(d, 55.0) : vec2(l, 56.0);
}
vec3 toRigid(vec3 p) {
  p.y -= uLift;
  p.xz = rot(uYaw)*p.xz;
  return p;
}
vec3 fallXf(vec3 pAttached, vec3 wp){
  if (uFall < 0.001) return pAttached;
  vec3 pr = toRigid(wp);
  vec3 p = mix(pAttached, pr, smoothstep(0.0, 0.6, uFall));
  vec3 c = mix(uAnchor, uLand, uFall) + vec3(0.0, sin(clamp(uFall, 0.0, 1.0)*3.14159)*(uOutfit == 17 ? 0.0 : 0.42), 0.0);
  vec3 q = p - c;
  q.xy = rot(uFallRot.x*uFall)*q.xy;
  q.yz = rot(uFallRot.y*uFall)*q.yz;
  return q + uAnchor;
}
`

export const MAP = `vec2 map(vec3 wp){
  vec3 p = toObject(wp);
  vec2 res = vec2(bodyD(p)*0.72, 1.0);
#if PROP == 1
  vec2 h = hat(fallXf(p, wp));
#elif PROP == 2
  vec2 h = monocle(fallXf(p, wp));
#elif PROP == 3
  vec2 h = pencil(fallXf(p, wp));
#elif PROP == 4
  vec2 h = helmet(fallXf(p, wp));
#elif PROP == 5
  vec2 h = phones(fallXf(p, wp));
#elif PROP == 6
  vec2 h = glasses(fallXf(p, wp));
#elif PROP == 7
  vec2 h = leaves(p);
#elif PROP == 8
  vec2 h = beret(fallXf(p, wp));
#elif PROP == 9
  vec2 h = clapper(fallXf(p, wp));
#elif PROP == 10
  vec2 h = sweatband(fallXf(p, wp));
#elif PROP == 11
  vec2 h = goggles(fallXf(p, wp));
#elif PROP == 12
  vec2 h = piggy(p, fallXf(p, wp));
#elif PROP == 13
  vec2 h = headset(fallXf(p, wp));
#elif PROP == 14
  vec2 h = skipper(fallXf(p, wp));
#elif PROP == 15
  vec2 h = headMirror(fallXf(p, wp));
#elif PROP == 16
  vec2 h = stopSign(fallXf(p, wp));
#elif PROP == 17
  vec2 h = bugParts(p);
#endif
#if PROP != 0
  if (h.x*0.72 < res.x) res = vec2(h.x*0.72, h.y);
#endif
  return res;
}
float bodyMap(vec3 wp) {
  return bodyD(toObject(wp))*0.72;
}

vec3 calcNormal(vec3 p){
  const vec2 k = vec2(1.0, -1.0);
  const float h = 0.0015;
  return normalize(k.xyy*map(p + k.xyy*h).x + k.yyx*map(p + k.yyx*h).x + k.yxy*map(p + k.yxy*h).x + k.xxx*map(p + k.xxx*h).x);
}
float softShadow(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.04;
  for (int i = 0; i < 18; i++) {
    vec2 m = map(ro + rd*t);
    float h = m.x;
    res = min(res, (m.y > 1.5 ? 4.5 : 8.0)*h/t);
    t += clamp(h, 0.04, 0.3);
    if (res < 0.004 || t > 3.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float calcAO(vec3 p, vec3 n){
  float o = (0.08 - bodyMap(p + n*0.08)) + (0.22 - bodyMap(p + n*0.22))*0.6;
  return clamp(1.0 - 1.5*o, 0.0, 1.0);
}
`

export const LIB2 = `
float hash(vec3 p) {
  p = fract(p*0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x*p.y*p.z*(p.x + p.y + p.z));
}
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 ramp(float t, vec3 a, vec3 b, vec3 c, vec3 d){
  if (t < 0.4) return mix(a, b, smoothstep(0.0, 0.4, t));
  if (t < 0.72) return mix(b, c, smoothstep(0.4, 0.72, t));
  return mix(c, d, smoothstep(0.72, 1.0, t));
}
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba*clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0));
}
float sdArc(vec2 p, vec2 c, float r, float a0, float a1){
  vec2 q = p - c;
  float a = atan(q.y, q.x);
  float ac = clamp(a, a0, a1);
  return length(q - r*vec2(cos(ac), sin(ac)));
}

`

export const FACE = `
struct Decal {
  float ink;
  float glint;
  float cheek;
  float lens;
  float streak;
  float tongue;
  float socket;
  float lid;
  float mouth;
  vec3 eyeTint;
  float eyeTintA;
  float warm;
  float bounce;
  float crease;
  float mouthT;
  float tongueHi;
};


void brow(inout Decal D, vec2 p, vec2 c, float a, float b, float aa, float lw){
  vec2 s0 = c + vec2(-0.058, a), s1 = c + vec2(0.058, b);
  vec2 mid = (s0 + s1)*0.5 + vec2(0.0, 0.014);
  float t = clamp(dot(p - s0, s1 - s0)/dot(s1 - s0, s1 - s0), 0.0, 1.0);
  vec2 onCurve = mix(mix(s0, mid, t), mix(mid, s1, t), t);
  float taper = mix(0.55, 1.0, sin(t*3.14159));
  float d = length(p - onCurve) - lw*0.64*taper;
  D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, d))*0.7*uBrowOn*(1.0 - uSmall));
}

float taperSeg(vec2 p, vec2 a, vec2 b, float w0, float w1){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0);
  return length(pa - ba*h) - mix(w0, w1, h);
}
float taperArc(vec2 p, vec2 c, float r, float a0, float a1, float w){
  vec2 q = p - c;
  float a = atan(q.y, q.x);
  float ac = clamp(a, a0, a1);
  float t = (ac - a0)/(a1 - a0);
  return length(q - r*vec2(cos(ac), sin(ac))) - w*mix(0.4, 1.0, sin(t*3.14159));
}
float gArcFade = 1.0;
void innocentEyeX(inout Decal D, vec2 p, vec2 c, float rx, float ry, float aa, float lw, float lid, float excite, float wet){
  float close = clamp(max(uBlink, lid), 0.0, 1.0);
  float squash = 1.0 - close*close*(3.0 - 2.0*close);
  float sm = clamp(uSmile, 0.0, 1.0);
  vec2 cc = c + vec2(0.0, -ry*0.2*close + 0.06*sm);
  float ery = max(ry*squash*(1.0 - 0.55*sm), 0.0005);
  float ny = clamp((p.y - cc.y)/ery, -1.0, 1.0);
  float erx = rx*(1.0 + 0.1*close + 0.22*sm)*(1.0 - 0.13*ny);
  vec2 d = (p - cc)/vec2(erx, ery);
  float k = length(d);
  float edge = aa/min(erx, ery);
  float body = 1.0 - smoothstep(0.8, 0.9, close);
  float inside = (1.0 - smoothstep(1.0 - edge, 1.0 + edge, k))*body;
  float whole = inside;
  if (sm > 0.0) {
    float sx = clamp(d.x, -1.0, 1.0);
    float lowY = cc.y + ery*sqrt(max(0.0, 1.0 - sx*sx)) - mix(2.2*ery, lw*1.2, sm);
    inside *= smoothstep(lowY - aa, lowY + aa, p.y)*(1.0 - smoothstep(0.7, 1.0, sm));
  }
  D.ink = max(D.ink, inside);
  float kr = length((p - c)/vec2(rx*1.25, ry*1.15));
  D.socket = max(D.socket, (1.0 - smoothstep(0.85, 1.35, kr))*(1.0 - whole)*0.55*(1.0 - close)*(1.0 - sm));
  vec3 bead = vec3(0.03, 0.03, 0.045);
  vec3 refl = vec3(0.4, 0.53, 0.82);
  float zone = smoothstep(0.1, -0.72, d.y)*(1.0 - smoothstep(0.86, 1.0, k));
  bead = mix(bead, refl, zone*min(1.0, 0.9 + 0.1*excite + 0.1*wet));
  if (inside > D.eyeTintA) {
    D.eyeTint = bead;
    D.eyeTintA = inside;
  }
  float fade = (1.0 - smoothstep(0.2, 0.5, close))*(1.0 - smoothstep(0.35, 0.8, sm));
  vec2 h = d - vec2(-0.1, 0.5) + uLook*1.0;
  h = vec2(h.x*0.96 + h.y*0.28, -h.x*0.28 + h.y*0.96);
  float g = (length(h/vec2(0.5 + 0.06*excite, 0.26 + 0.04*excite)) - 1.0)*0.26;
  D.glint = max(D.glint, (1.0 - smoothstep(-0.03, 0.03, g))*inside*fade);
  float tear = (1.0 - smoothstep(0.0, 0.1, abs(k - 0.82)))*smoothstep(-0.3, -0.8, d.y);
  D.glint = max(D.glint, tear*inside*0.5*wet*(1.0 - uSmall));
  float shut = smoothstep(0.78, 0.92, close)*(1.0 - uSleepy)*gArcFade;
  float arc = taperArc(p, cc + vec2(0.0, rx*1.05), rx*1.1, -2.42, -0.72, lw*1.0);
  D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, arc))*shut);
}
void innocentEye(inout Decal D, vec2 p, vec2 c, float rx, float ry, float aa, float lw, float lid) {
  innocentEyeX(D, p, c, rx, ry, aa, lw, lid, 0.0, 0.0);
}
void closedHappy(inout Decal D, vec2 p, vec2 c, float r, float aa, float lw, float side, float alpha){
  float d = taperArc(p, c, r, 0.42, 2.72, lw*1.2);
  float ao = side < 0.0 ? 2.72 : 0.42;
  vec2 e = c + r*vec2(cos(ao), sin(ao));
  d = min(d, taperSeg(p, e, e + vec2(side*0.032, 0.014), lw*0.62, lw*0.18));
  D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, d))*alpha);
  vec2 v = p - c;
  float ang = atan(v.y, v.x);
  float cr = abs(length(v) - (r - 0.034));
  D.crease = max(D.crease, (1.0 - smoothstep(0.0, 0.028, cr))*smoothstep(0.55, 0.9, ang)*smoothstep(2.6, 2.25, ang)*(1.0 - uSmall)*alpha);
}
void mouthFill(inout Decal D, float inside, float t){
  if (inside > D.mouth) {
    D.mouth = inside;
    D.mouthT = clamp(t, 0.0, 1.0);
  }
}
float gAlpha = 1.0;
void tongueAt(inout Decal D, vec2 p, vec2 tc, vec2 tr, float clipY){
  float tg = length((p - tc)/tr) - 1.0;
  float inT = (1.0 - smoothstep(-0.12, 0.12, tg))*step(p.y, clipY)*gAlpha;
  D.tongue = max(D.tongue, inT*(1.0 - uSmall));
  float hi = length((p - tc - vec2(-tr.x*0.35, tr.y*0.2))/(tr*vec2(0.32, 0.26))) - 1.0;
  D.tongueHi = max(D.tongueHi, (1.0 - smoothstep(-0.3, 0.3, hi))*inT);
}
void cheekAt(inout Decal D, vec2 p, vec2 c, float s){
  float ck = length((p - c)/vec2(0.11, 0.065)*s) - 0.0;
  D.cheek = max(D.cheek, (1.0 - smoothstep(0.25, 1.0, ck))*(1.0 - uSmall));
}

void sleepyEyes(inout Decal D, vec2 p, vec2 eL0, vec2 eR0, float aa, float lw, float alpha){
  for (int i = 0; i < 2; i++) {
    vec2 c = (i == 0 ? eL0 : eR0) + vec2(0.0, 0.06);
    float r = uEyeRX*1.12;
    float d = taperArc(p, c, r, -2.62, -0.52, lw*1.05);
    for (int j = 0; j < 3; j++) {
      float a = mix(-2.2, -0.94, float(j)/2.0);
      vec2 e = c + r*vec2(cos(a), sin(a));
      d = min(d, taperSeg(p, e, e + vec2(cos(a), sin(a))*0.026, lw*0.4, lw*0.12));
    }
    D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, d))*alpha);
    float cr = abs(length(p - c) - (r + 0.032));
    float ang = atan((p - c).y, (p - c).x);
    D.crease = max(D.crease, (1.0 - smoothstep(0.0, 0.03, cr))*smoothstep(-2.5, -2.2, ang)*smoothstep(-0.62, -0.9, ang)*(1.0 - uSmall)*alpha);
  }
}

void winkParts(inout Decal D, vec2 p, vec2 eL0, vec2 mid, float aa, float lw, float alpha){
  vec2 cl = eL0 + vec2(0.0, -0.005);
  vec2 vtx = cl + vec2(0.05, 0.0), t0 = cl + vec2(-0.06, 0.046), t1 = cl + vec2(-0.06, -0.04);
  float chev = min(taperSeg(p, t0, vtx, lw*0.45, lw*1.25), taperSeg(p, vtx, t1, lw*1.25, lw*0.45));
  chev = min(chev, taperSeg(p, t0, t0 + vec2(-0.03, 0.02), lw*0.5, lw*0.15));
  D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, chev))*alpha);
  float fold = min(taperSeg(p, t0 + vec2(0.012, -0.018), vtx + vec2(-0.02, 0.0), 0.004, 0.012), taperSeg(p, vtx + vec2(-0.02, 0.0), t1 + vec2(0.012, 0.016), 0.012, 0.004));
  D.crease = max(D.crease, (1.0 - smoothstep(0.0, 0.02, fold))*(1.0 - uSmall)*alpha);
  vec2 m = mid + vec2(0.02, -0.205);
  float smile = taperArc(p, m + vec2(0.0, 0.055), 0.066, -2.35, -0.8, lw*0.7);
  D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, smile))*(1.0 - uSmall)*alpha);
  gAlpha = alpha;
  tongueAt(D, p, m + vec2(0.03, -0.017), vec2(0.024, 0.03), m.y - 0.009);
  gAlpha = 1.0;
}

Decal face(vec3 q){
  Decal D = Decal(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, vec3(0.0), 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  if (q.z < 0.0) return D;
  float aa = max(uSmall > 0.5 ? 0.012 : 0.0055, uPixW*0.75);
  vec2 L = uEyeL.xy + uLook, R = uEyeR.xy + uLook;
  if (q.x < min(L.x, R.x) - 0.34 || q.x > max(L.x, R.x) + 0.34 || q.y < min(L.y, R.y) - 0.46 || q.y > max(L.y, R.y) + 0.4) return D;
  float rx = uEyeRX*uEyeScale.x, ry = uEyeRY*uEyeScale.y;
  float lw = max(uSmall > 0.5 ? 0.034 : 0.022, uPixW*1.25);
  float by = uEyeRY + 0.03;
  vec2 bl = uEyeL.xy + uLook*0.6 + vec2(0.02, by), br = uEyeR.xy + uLook*0.6 + vec2(-0.02, by);
  vec2 eL0 = L + vec2(0.03, -0.07), eR0 = R + vec2(-0.03, -0.07);
  vec2 cheekL = eL0 + vec2(-0.09, -0.173), cheekR = eR0 + vec2(0.09, -0.173);
  vec2 mid = (eL0 + eR0)*0.5;
#if !defined(FACE_ONLY) || FACE_ONLY == 0
  if (uFaceMode == 0) {
    float erx = 0.079, ery = 0.138;
    if (uSmall > 0.5) {
      erx *= 1.32;
      ery *= 1.14;
    }
    vec2 eL = L + vec2(0.03, -0.07), eR = R + vec2(-0.03, -0.07);
    gArcFade = 1.0 - uWink;
    innocentEye(D, q.xy, eL, erx*uEyeScale.x, ery*uEyeScale.y, aa, lw, uLids.x);
    gArcFade = 1.0;
    innocentEye(D, q.xy, eR, erx*0.97*uEyeScale.x, ery*0.98*uEyeScale.y, aa, lw, uLids.y);
    if (uWink > 0.0) winkParts(D, q.xy, eL0, mid, aa, lw, uWink);
    if (uSleepy > 0.0) sleepyEyes(D, q.xy, eL0, eR0, aa, lw, uSleepy);
    if (uSmile > 0.0) {
      float ha = smoothstep(0.7, 1.0, uSmile);
      closedHappy(D, q.xy, eL0 + vec2(0.0, 0.01), uEyeRX*1.22, aa, lw, -1.0, ha);
      closedHappy(D, q.xy, eR0 + vec2(0.0, 0.01), uEyeRX*1.22, aa, lw, 1.0, ha);
    }
    cheekAt(D, q.xy, eL + vec2(-0.09, -ery - 0.035), 1.1);
    cheekAt(D, q.xy, eR + vec2(0.09, -ery - 0.035), 1.1);
    if (uOutfit == 13) {
      vec2 m = snoutC().xy + vec2(0.0, -0.135);
      float smile = taperArc(q.xy, m, 0.045, -2.45, -0.69, lw*0.7);
      D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, smile))*(1.0 - uSmall));
    } else if (uRestMouth > 0.5) {
      vec2 m = (eL + eR)*0.5 + vec2(0.0, -ery - 0.03);
      float mouth = taperArc(q.xy, m + vec2(0.0, 0.02), 0.024, -2.5, -0.64, lw*0.68);
      D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, mouth))*(1.0 - uSmall*0.5)*(1.0 - uSmile)*(1.0 - uSleepy)*(1.0 - uWink));
    }
    if (uOutfit == 7) {
      for (int i = 0; i < 2; i++) {
        vec2 c = (i == 0 ? uEyeL.xy + vec2(0.03, 0.0) : uEyeR.xy - vec2(0.03, 0.0)) + vec2(0.0, -0.07 - uGlassY);
        float lr = length(q.xy - c);
        float inLens = 1.0 - smoothstep(0.165, 0.175, lr);
        D.lens = max(D.lens, inLens);
        D.streak = max(D.streak, (1.0 - smoothstep(0.0, 0.013, abs(lr - 0.13)))*step(0.0, -(q.x - c.x) - (q.y - c.y)*0.25)*step(0.0, q.y - c.y)*inLens*(1.0 - uSmall));
      }
    }
    brow(D, q.xy, bl, uBrows.x, uBrows.y, aa, lw);
    brow(D, q.xy, br, uBrows.z, uBrows.w, aa, lw);
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 1
  if (uFaceMode == 1) {
    closedHappy(D, q.xy, eL0 + vec2(0.0, 0.01), uEyeRX*1.22, aa, lw, -1.0, 1.0);
    closedHappy(D, q.xy, eR0 + vec2(0.0, 0.01), uEyeRX*1.22, aa, lw, 1.0, 1.0);
    cheekAt(D, q.xy, cheekL, 1.0);
    cheekAt(D, q.xy, cheekR, 1.0);
    brow(D, q.xy, bl + vec2(0.0, 0.022), uBrows.x + 0.004, uBrows.y + 0.004, aa, lw);
    brow(D, q.xy, br + vec2(0.0, 0.022), uBrows.z + 0.004, uBrows.w + 0.004, aa, lw);
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 2
  if (uFaceMode == 2) {
    innocentEye(D, q.xy, L + vec2(0.03, -0.05), 0.079, 0.138, aa, lw, uLids.x);
    innocentEye(D, q.xy, R + vec2(-0.03, -0.05), 0.079*1.22, 0.138*1.18, aa, lw, uLids.y);
    float lr = length(q.xy - R - vec2(-0.03, -0.05));
    D.lens = 1.0 - smoothstep(0.15, 0.16, lr);
    D.streak = (1.0 - smoothstep(0.0, 0.012, abs(lr - 0.12)))*step(0.0, -(q.x - R.x + 0.03) - (q.y - R.y + 0.05)*0.2)*step(0.0, q.y - R.y + 0.05)*D.lens*(1.0 - uSmall);
    brow(D, q.xy, bl, uBrows.x, uBrows.y, aa, lw);
    brow(D, q.xy, br + vec2(0.0, 0.07), uBrows.z, uBrows.w, aa, lw);
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 5
  if (uFaceMode == 5) {
    innocentEyeX(D, q.xy, eL0 + vec2(-0.012, 0.03), 0.1, 0.14, aa, lw, 0.0, 0.4, 0.0);
    innocentEyeX(D, q.xy, eR0 + vec2(0.012, 0.03), 0.098, 0.138, aa, lw, 0.0, 0.4, 0.0);
    brow(D, q.xy, bl + vec2(-0.012, 0.1), 0.0, 0.02, aa, lw*1.3);
    brow(D, q.xy, br + vec2(0.012, 0.1), 0.02, 0.0, aa, lw*1.3);
    vec2 m = mid + vec2(0.0, -0.2);
    float o = length((q.xy - m)/vec2(0.046, 0.064)) - 1.0;
    float inM = 1.0 - smoothstep(-0.06, 0.06, o);
    mouthFill(D, inM, (m.y + 0.064 - q.y)/0.128);
    tongueAt(D, q.xy, m + vec2(0.0, -0.05), vec2(0.036, 0.026), m.y - 0.02);
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 6
  if (uFaceMode == 6) {
    for (int i = 0; i < 2; i++) {
      vec2 c = i == 0 ? eL0 : eR0;
      vec2 v = q.xy - c;
      float r = length(v);
      float a = mod(atan(v.y, v.x) + uTime*7.0*(i == 0 ? 1.0 : -1.0) + 3.14159, 6.28318) - 3.14159;
      float k = 0.0125;
      float d = 1e9;
      for (int j = 0; j < 4; j++) d = min(d, abs(r - k*(a + 3.14159 + 6.28318*float(j))));
      d = max(d - lw*0.66, r - rx*1.38);
      D.ink = max(D.ink, 1.0 - smoothstep(-aa, aa, d));
    }
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 7
  if (uFaceMode == 7) {
    innocentEyeX(D, q.xy, eL0 + vec2(0.0, 0.01), 0.088, 0.152, aa, lw, 0.0, uGlow, 0.0);
    innocentEyeX(D, q.xy, eR0 + vec2(0.0, 0.01), 0.086, 0.149, aa, lw, 0.0, uGlow, 0.0);
    cheekAt(D, q.xy, cheekL, 1.0);
    cheekAt(D, q.xy, cheekR, 1.0);
    brow(D, q.xy, bl + vec2(0.0, 0.045), 0.02, 0.026, aa, lw);
    brow(D, q.xy, br + vec2(0.0, 0.045), 0.026, 0.02, aa, lw);
    vec2 m = mid + vec2(0.0, -0.215);
    float hd = max(length(q.xy - m - vec2(0.0, 0.012)) - 0.05, q.y - m.y - 0.012);
    float inM = 1.0 - smoothstep(-aa, aa, hd);
    mouthFill(D, inM, (m.y + 0.012 - q.y)/0.06);
    tongueAt(D, q.xy, m + vec2(0.0, -0.03), vec2(0.03, 0.022), m.y + 0.012);
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 8
  if (uFaceMode == 8) {
    winkParts(D, q.xy, eL0, mid, aa, lw, 1.0);
    innocentEyeX(D, q.xy, eR0 + vec2(0.0, 0.01), 0.085, 0.148, aa, lw, 0.0, 1.0, 0.0);
    cheekAt(D, q.xy, cheekL + vec2(0.01, 0.025), 0.82);
    cheekAt(D, q.xy, cheekR, 1.15);
    brow(D, q.xy, bl + vec2(0.0, -0.014), -0.002, -0.016, aa, lw);
    brow(D, q.xy, br + vec2(0.0, 0.048), 0.024, 0.032, aa, lw);
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 9
  if (uFaceMode == 9) {
    sleepyEyes(D, q.xy, eL0, eR0, aa, lw, 1.0);
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 10
  if (uFaceMode == 10) {
    innocentEyeX(D, q.xy, eL0, 0.07, 0.122, aa, lw, 0.0, 0.0, 1.0);
    innocentEyeX(D, q.xy, eR0, 0.069, 0.12, aa, lw, 0.0, 0.0, 1.0);
    brow(D, q.xy, bl + vec2(0.0, 0.004), -0.006, 0.026, aa, lw);
    brow(D, q.xy, br + vec2(0.0, 0.004), 0.026, -0.006, aa, lw);
    vec2 m = mid + vec2(0.0, -0.19);
    float dx = q.x - m.x;
    float tp = mix(1.0, 0.45, smoothstep(0.02, 0.052, abs(dx)));
    float w = abs(q.y - m.y - 0.009*sin(dx*72.0)) - lw*0.42*tp;
    w = max(w, abs(dx) - 0.052);
    D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, w))*(1.0 - uSmall));
    return D;
  }
#endif
#if !defined(FACE_ONLY) || FACE_ONLY == 4
  {
    for (int i = 0; i < 2; i++) {
      vec2 c = i == 0 ? L : R;
      if (i == 1 && uPeek > 0.5) {
        innocentEyeX(D, q.xy, c, 0.079, 0.138, aa, lw, 0.35, 0.0, 0.0);
        continue;
      }
      float sx = uEyeRX*1.05;
      float d = min(min(taperSeg(q.xy, c + vec2(-sx, -sx), c, lw*0.5, lw*1.05), taperSeg(q.xy, c, c + vec2(sx, sx), lw*1.05, lw*0.5)), min(taperSeg(q.xy, c + vec2(-sx, sx), c, lw*0.5, lw*1.05), taperSeg(q.xy, c, c + vec2(sx, -sx), lw*1.05, lw*0.5)));
      D.ink = max(D.ink, 1.0 - smoothstep(-aa, aa, d));
    }
    vec2 m = (L + R)*0.5 + vec2(0.03, -0.19);
    float mouth = taperArc(q.xy, m + vec2(0.0, 0.08), 0.085, -2.2, -0.9, lw*0.7);
    D.ink = max(D.ink, (1.0 - smoothstep(-aa, aa, mouth))*(1.0 - uSmall));
    tongueAt(D, q.xy, m + vec2(0.035, -0.065), vec2(0.045, 0.068), m.y - 0.02);
  }
#endif
  return D;
}


`

export const SHADE = `
vec3 env(vec3 r) {
  return mix(vec3(0.62, 0.58, 0.55), vec3(1.0, 0.99, 0.97), smoothstep(-0.4, 0.8, r.y));
}

const vec4 BUG_SPOTS[${BUG_SPOTS.length}] = vec4[${BUG_SPOTS.length}](${BUG_SPOTS.map(v => `vec4(${v.map(n => n.toFixed(3)).join(', ')})`).join(', ')});
float bugSpots(vec3 q, float aa){
  float c = 0.0;
  for (int i = 0; i < ${BUG_SPOTS.length}; i++) {
    vec4 s = BUG_SPOTS[i];
    float k = clamp((uBug - float(i)*0.07)/0.3, 0.0, 1.0) - 1.0;
    float g = 1.0 + 2.70158*k*k*k + 1.70158*k*k;
    c = max(c, (1.0 - smoothstep(-aa, aa, length(q - s.xyz) - s.w*g))*smoothstep(0.0, 0.12, g));
  }
  float seam = (1.0 - smoothstep(${BUG_SEAM.w.toFixed(3)} - aa, ${BUG_SEAM.w.toFixed(3)} + aa, abs(q.x - ${BUG_SEAM.x.toFixed(3)})))*smoothstep(${(-BUG_SEAM.front[0]).toFixed(3)}, ${(-BUG_SEAM.front[1]).toFixed(3)}, -q.z)*smoothstep(-0.7, -0.45, q.y);
  return max(c, seam*clamp(uBug*1.6 - 0.6, 0.0, 1.0));
}

vec3 shadeWith(vec3 N, vec3 q, vec3 rd, float sh, float ao, float mat){
  vec3 V = -rd;
  vec3 L = normalize(vec3(-0.55, 0.78, 0.6));
  vec3 F = normalize(vec3(0.8, 0.15, 0.55));
  vec3 H = normalize(L + V);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
  if (mat < 1.5) {
    if (uFuzz > 0.0) {
      vec3 g = vec3(vnoise(q*46.0), vnoise(q*46.0 + 17.3), vnoise(q*46.0 + 41.7)) - 0.5;
      N = normalize(N + g*0.09*uFuzz*(uOutfit == 18 ? 0.45 : 1.0));
    }
    Decal D = face(q);
    float wrap = clamp((dot(N, L) + 0.28)/1.28, 0.0, 1.0);
    float t = pow(wrap, 1.15)*mix(1.0, sh, 0.8);
    vec3 col = ramp(t, cDeep, cShade, cBase, cLight);
    col *= mix(0.82, 1.0, ao);
    col += cBase*0.12*max(dot(N, F), 0.0);
    col += cLight*0.18*clamp(-N.y, 0.0, 1.0)*ao;
    float sheen = 0.3;
    col += mix(cLight, vec3(1.0), 0.3)*fres*sheen*(0.6 + 0.4*sh);
    col += vec3(1.0)*pow(max(dot(N, H), 0.0), 10.0)*0.05*sh;
    if (uOutfit == 18) {
      col += vec3(1.0, 0.93, 0.9)*pow(max(dot(N, H), 0.0), 22.0)*0.16*sh;
      float sp = bugSpots(q, max(0.004, uPixW*0.75));
      vec3 spot = mix(vec3(0.045, 0.04, 0.05), vec3(0.21, 0.18, 0.2), t)*mix(0.82, 1.0, ao);
      spot += vec3(1.0)*pow(max(dot(N, H), 0.0), 30.0)*0.12*sh + cLight*fres*0.06;
      col = mix(col, spot, sp);
    }
    col = mix(col, vec3(1.0, 0.55, 0.6), D.cheek*0.28);
    col *= 1.0 - 0.15*D.crease;
    col = mix(col, mix(vec3(0.15, 0.04, 0.065), vec3(0.4, 0.13, 0.16), D.mouthT), D.mouth*(1.0 - uSmall*0.3));
    col = mix(col, mix(vec3(0.94, 0.45, 0.55), vec3(0.8, 0.3, 0.42), 1.0 - wrap), D.tongue);
    col = mix(col, vec3(1.0, 0.8, 0.86), D.tongueHi*0.65);
    if (uGlow > 0.0) {
      float gd = length(q - tipEnd());
      float g = exp(-gd*gd*14.0)*uGlow;
      col = mix(col, vec3(1.0, 0.97, 0.82), clamp(g*0.9, 0.0, 1.0));
      col += vec3(1.0, 0.85, 0.45)*g*0.35;
    }
    col *= 1.0 - 0.13*D.socket*(1.0 - uSmall);
    col = mix(col, col*0.9 + cShade*0.06, D.lid);
    if (D.lens > 0.0) col = mix(col, col*1.08 + vec3(0.05), D.lens*0.6);
    vec3 ink = vec3(0.045, 0.045, 0.06) + vec3(0.9)*pow(max(dot(N, H), 0.0), 60.0)*0.5;
    col = mix(col, ink, D.ink);
    col = mix(col, D.eyeTint, D.eyeTintA*D.ink);
    col = mix(col, vec3(1.0, 0.9, 0.62), D.warm*0.95);
    col = mix(col, mix(cLight, vec3(1.0), 0.2), D.bounce*D.ink);
    col = mix(col, vec3(1.0), D.glint*0.95);
    col = mix(col, vec3(1.0), D.streak*0.8);
    return col;
  }
#if PROP == 1 || defined(ALLMATS)
  if (mat < 2.5) {
    vec3 qh = (q - vec3(crownXY(), 0.0))/uCrown.z;
    qh.xy = rot(uHatTilt + crownTilt())*qh.xy;
    float r = length(qh.xz);
    float wrap = clamp((dot(N, L) + 0.45)/1.45, 0.0, 1.0)*mix(1.0, sh, 0.7);
    vec3 col = mix(vec3(0.8, 0.8, 0.88), vec3(1.0, 0.995, 0.985), wrap);
    col *= 1.0 - 0.1*smoothstep(-0.2, -0.9, hatFold(qh));
    col *= 1.0 - 0.22*smoothstep(0.16, 0.3, qh.y)*(1.0 - smoothstep(0.3, 0.36, qh.y))*(1.0 - smoothstep(0.37, 0.41, r));
    col *= 1.0 - 0.08*(1.0 - smoothstep(0.004, 0.012, abs(qh.y - 0.058)))*step(r, 0.37);
    col *= 1.0 - 0.1*(1.0 - smoothstep(0.02, 0.1, r))*step(0.6, qh.y);
    col += vec3(0.85, 0.88, 1.0)*fres*0.1 + vec3(1.0)*pow(max(dot(N, H), 0.0), 18.0)*0.05*sh;
    return col*mix(0.84, 1.0, ao);
  }
#endif
#if PROP == 2 || defined(ALLMATS)
  if (mat < 3.5) {
    vec3 R = reflect(rd, N);
    float wrapG = clamp((dot(N, L) + 0.3)/1.3, 0.0, 1.0);
    vec3 col = mix(vec3(0.86, 0.6, 0.2), vec3(1.0, 0.86, 0.46), wrapG);
    col = mix(col, vec3(1.0, 0.95, 0.78), smoothstep(0.55, 1.0, R.y)*0.35);
    col += vec3(1.0, 0.97, 0.88)*pow(max(dot(R, L), 0.0), 40.0)*0.8;
    col += vec3(1.0, 0.9, 0.6)*fres*0.25;
    col *= mix(0.85, 1.0, ao);
    return col;
  }
#endif
#if PROP == 3 || defined(ALLMATS)
  if (mat < 5.5) {
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    vec3 col = mix(vec3(0.86, 0.55, 0.12), vec3(1.0, 0.86, 0.36), wrap*mix(1.0, sh, 0.7));
    col += vec3(1.0)*pow(max(dot(N, H), 0.0), 40.0)*0.35*sh;
    return col*mix(0.75, 1.0, ao);
  }
  if (mat < 6.5) {
    vec3 dx = normalize(uPenD);
    float along = dot(q - uPenC, dx);
    vec3 dy = normalize(cross(vec3(0.0, 0.0, 1.0), dx));
    vec3 dz = cross(dx, dy);
    float ang = atan(dot(q - uPenC, dz), dot(q - uPenC, dy));
    float scallop = 0.5 + 0.018*cos(ang*6.0);
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    vec3 wood = mix(vec3(0.72, 0.52, 0.32), vec3(0.98, 0.86, 0.66), wrap*mix(1.0, sh, 0.7));
    vec3 paint = mix(vec3(0.86, 0.55, 0.12), vec3(1.0, 0.86, 0.36), wrap);
    vec3 lead = mix(vec3(0.1, 0.1, 0.12), vec3(0.42, 0.42, 0.48), wrap) + vec3(1.0)*pow(max(dot(N, H), 0.0), 50.0)*0.5;
    vec3 col = along < scallop ? paint : wood;
    if (along > 0.67) col = lead;
    return col*mix(0.75, 1.0, ao);
  }
  if (mat < 8.5) {
    vec3 R = reflect(rd, N);
    vec3 dx = normalize(uPenD);
    float along = dot(q - uPenC, dx);
    float ridge = 0.85 + 0.15*step(0.5, fract((along + 0.6)*55.0));
    vec3 col = vec3(0.78, 0.8, 0.86)*env(R)*ridge*(0.6 + 0.4*sh) + vec3(1.0)*pow(max(dot(R, L), 0.0), 24.0)*0.6*sh;
    return col*mix(0.75, 1.0, ao);
  }
#endif
#if PROP == 4 || defined(ALLMATS)
  if (mat < 10.5) {
    vec3 R = reflect(rd, N);
    float w = clamp((dot(N, L) + 0.3)/1.3, 0.0, 1.0);
    vec3 col = mix(vec3(0.93, 0.62, 0.08), vec3(1.0, 0.85, 0.25), w*mix(1.0, sh, 0.7));
    col += vec3(1.0)*pow(max(dot(R, L), 0.0), 60.0)*0.7*sh + vec3(1.0, 0.95, 0.8)*fres*0.2;
    return col*mix(0.8, 1.0, ao);
  }
#endif
#if PROP == 5 || defined(ALLMATS)
  if (mat < 11.5) {
    float w = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    vec3 col = mix(vec3(0.12, 0.12, 0.15), vec3(0.34, 0.34, 0.4), w*mix(1.0, sh, 0.7));
    col += vec3(1.0)*pow(max(dot(N, H), 0.0), 30.0)*0.18*sh + vec3(0.7, 0.72, 0.8)*fres*0.2;
    return col*mix(0.8, 1.0, ao);
  }
  if (mat < 12.5) {
    float w = clamp((dot(N, L) + 0.4)/1.4, 0.0, 1.0);
    return mix(vec3(0.62, 0.62, 0.68), vec3(0.93, 0.93, 0.96), w)*mix(0.85, 1.0, ao);
  }
#endif
#if PROP == 6 || defined(ALLMATS)
  if (mat < 13.5) {
    vec3 R = reflect(rd, N);
    vec3 col = vec3(0.1, 0.08, 0.09) + vec3(1.0)*pow(max(dot(R, L), 0.0), 50.0)*0.8 + vec3(0.5)*fres*0.3;
    return col;
  }
#endif
#if PROP == 7 || defined(ALLMATS)
  if (mat < 14.5) {
    float w = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    vec3 col = mix(vec3(0.2, 0.5, 0.2), vec3(0.55, 0.85, 0.4), w*mix(1.0, sh, 0.7));
    col += vec3(0.8, 1.0, 0.7)*fres*0.25;
    return col*mix(0.8, 1.0, ao);
  }
#endif
#if PROP == 8 || defined(ALLMATS)
  if (abs(mat - 16.0) < 0.5) {
    float w = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    vec3 col = mix(vec3(0.07, 0.07, 0.09), vec3(0.27, 0.26, 0.31), w*mix(1.0, sh, 0.7));
    col += vec3(0.78, 0.74, 0.88)*fres*0.3;
    col += vec3(1.0)*pow(max(dot(N, H), 0.0), 22.0)*0.1*sh;
    return col*mix(0.8, 1.0, ao);
  }
#endif
#if PROP == 9 || defined(ALLMATS)
  if (abs(mat - 17.0) < 0.5 || abs(mat - 18.0) < 0.5) {
    vec3 R = reflect(rd, N);
    vec3 w = wearQ(q, 0.16);
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    vec3 ink = mix(vec3(0.05, 0.05, 0.07), vec3(0.2, 0.2, 0.24), wrap*mix(1.0, sh, 0.7));
    vec3 chalk = mix(vec3(0.8, 0.8, 0.84), vec3(1.0), wrap);
    vec3 col = ink;
    if (mat > 17.5) {
      vec3 a = w.y > 0.58 ? clapArm(w) : w - vec3(0.0, 0.53, 0.0);
      col = fract((a.x + a.y*0.9)*3.2 + 0.25) < 0.5 ? chalk : ink;
    } else if (abs(N.z) > 0.6 && (abs(w.y - 0.33) < 0.012 || abs(w.y - 0.2) < 0.012) && abs(w.x) < 0.34) col = mix(col, chalk*0.85, 0.85);
    col += vec3(1.0)*pow(max(dot(R, L), 0.0), 40.0)*0.35*sh;
    return col*mix(0.8, 1.0, ao);
  }
#endif
#if PROP == 10 || defined(ALLMATS)
  if (abs(mat - 19.0) < 0.5) {
    vec3 w = wearQ(q, 0.06);
    float ang = atan(w.z, w.x);
    float wrap = clamp((dot(N, L) + 0.4)/1.4, 0.0, 1.0);
    vec3 col = mix(vec3(0.84, 0.84, 0.88), vec3(1.0), wrap*mix(1.0, sh, 0.6));
    col *= 0.94 + 0.06*cos(ang*140.0);
    col = mix(col, cDeep*mix(0.85, 1.1, wrap), smoothstep(0.046, 0.039, abs(w.y - 0.01)));
    col += vec3(1.0)*fres*0.12;
    return col*mix(0.85, 1.0, ao);
  }
#endif
#if PROP == 11 || defined(ALLMATS)
  if (abs(mat - 20.0) < 0.5 || abs(mat - 26.0) < 0.5) {
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    bool cup = mat > 25.5;
    vec3 col = cup ? mix(vec3(0.14, 0.08, 0.05), vec3(0.4, 0.25, 0.15), wrap*mix(1.0, sh, 0.7)) : mix(vec3(0.34, 0.2, 0.1), vec3(0.7, 0.46, 0.27), wrap*mix(1.0, sh, 0.7));
    vec3 w = wearQ(q, 0.0);
    float ang = atan(w.z, w.x);
    float stitch = cup ? 0.0 : (1.0 - smoothstep(0.004, 0.008, abs(abs(w.y) - 0.034)))*step(0.5, fract(ang*42.0))*step(0.62, length(w.xz));
    col = mix(col, vec3(0.93, 0.8, 0.6)*mix(0.7, 1.0, wrap), stitch*0.75);
    col += vec3(1.0, 0.85, 0.7)*pow(max(dot(N, H), 0.0), 24.0)*(cup ? 0.2 : 0.14)*sh;
    return col*mix(0.8, 1.0, ao);
  }
  if (abs(mat - 21.0) < 0.5) {
    vec3 R = reflect(rd, N);
    vec3 w = wearQ(q, 0.0);
    vec3 a = gogQ(w, sign(w.x + 1e-4));
    float knurl = 0.86 + 0.14*step(0.5, fract(atan(a.y, a.x)*7.64));
    float wrapG = clamp((dot(N, L) + 0.3)/1.3, 0.0, 1.0);
    vec3 col = mix(vec3(0.55, 0.36, 0.12), vec3(0.98, 0.82, 0.46), wrapG)*mix(knurl, 1.0, smoothstep(0.1, 0.12, a.z));
    col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.5, 1.0, R.y)*0.3);
    col += vec3(1.0, 0.95, 0.8)*pow(max(dot(R, L), 0.0), 50.0)*0.9*sh + vec3(1.0, 0.9, 0.6)*fres*0.25;
    return col*mix(0.8, 1.0, ao);
  }
  if (abs(mat - 22.0) < 0.5) {
    vec3 R = reflect(rd, N);
    vec3 col = mix(vec3(0.08, 0.18, 0.26), vec3(0.42, 0.66, 0.82), smoothstep(-0.3, 0.9, R.y));
    col = mix(col, vec3(0.96, 0.98, 1.0), smoothstep(0.82, 0.98, R.y)*0.6);
    col += vec3(1.0)*pow(max(dot(R, L), 0.0), 90.0)*1.2 + vec3(0.6, 0.85, 1.0)*fres*0.45;
    return col;
  }
#endif
#if PROP == 12 || defined(ALLMATS)
  if (abs(mat - 23.0) < 0.5 || abs(mat - 43.0) < 0.5) {
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0)*mix(1.0, sh, 0.7);
    vec3 col = ramp(pow(wrap, 1.15), cDeep, cShade, cBase, cLight)*mix(0.86, 1.0, ao);
    col += mix(cLight, vec3(1.0), 0.3)*fres*0.25 + vec3(1.0)*pow(max(dot(N, H), 0.0), 16.0)*0.08*sh;
    if (mat < 23.5) {
      vec3 s = snoutQ(q);
      col = mix(col, cLight*1.04 + vec3(0.02), 0.45);
      float nos = min(length((s.xy - vec2(-0.048, 0.0))/vec2(0.024, 0.036)), length((s.xy - vec2(0.048, 0.0))/vec2(0.024, 0.036))) - 1.0;
      col = mix(col, mix(cDeep, vec3(0.45, 0.14, 0.24), 0.55), (1.0 - smoothstep(-0.12, 0.12, nos))*smoothstep(0.03, 0.07, s.z));
      col += vec3(1.0)*pow(max(dot(N, H), 0.0), 40.0)*0.25*sh;
    } else col *= mix(1.0, 0.9, smoothstep(0.2, 0.8, dot(N, normalize(vec3(0.0, 0.2, 1.0)))));
    return col;
  }
  if (abs(mat - 44.0) < 0.5) {
    vec3 R = reflect(rd, N);
    vec3 c = pigCoinQ(wearQ(q, 0.0));
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0)*mix(1.0, sh, 0.7);
    vec3 col = mix(vec3(0.62, 0.4, 0.08), vec3(1.0, 0.85, 0.38), wrap);
    col = mix(col, vec3(1.0, 0.95, 0.72), smoothstep(0.55, 1.0, R.y)*0.3);
    float face = step(0.012, abs(c.z));
    float mark = min(abs(length(c.xy) - 0.15) - 0.011, dollar(vec2(c.x*sign(c.z + 1e-4), c.y), 0.62));
    col = mix(col, col*0.66, (1.0 - smoothstep(0.0, 0.007, mark))*face);
    col *= mix(1.0, 0.82 + 0.18*step(0.5, fract(atan(c.y, c.x)*7.64)), 1.0 - face);
    col += vec3(1.0, 0.95, 0.8)*pow(max(dot(R, L), 0.0), 40.0)*0.9*sh + vec3(1.0, 0.9, 0.6)*fres*0.25;
    return col*mix(0.8, 1.0, ao);
  }
#endif
#if PROP == 13 || defined(ALLMATS)
  if (abs(mat - 24.0) < 0.5) {
    vec3 R = reflect(rd, N);
    float wrap = clamp((dot(N, L) + 0.4)/1.4, 0.0, 1.0);
    vec3 col = mix(vec3(0.1, 0.15, 0.3), vec3(0.3, 0.42, 0.64), wrap*mix(1.0, sh, 0.6));
    col += vec3(1.0)*pow(max(dot(R, L), 0.0), 40.0)*0.35*sh;
    return col*mix(0.8, 1.0, ao);
  }
  if (abs(mat - 25.0) < 0.5) {
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    return mix(vec3(0.08, 0.08, 0.1), vec3(0.26, 0.26, 0.3), wrap*mix(1.0, sh, 0.7))*mix(0.8, 1.0, ao);
  }
#endif
#if PROP == 14 || defined(ALLMATS)
  if (abs(mat - 45.0) < 0.5) {
    float wrap = clamp((dot(N, L) + 0.45)/1.45, 0.0, 1.0)*mix(1.0, sh, 0.7);
    vec3 col = mix(vec3(0.8, 0.81, 0.87), vec3(1.0, 0.995, 0.985), wrap);
    col += vec3(0.85, 0.88, 1.0)*fres*0.1 + vec3(1.0)*pow(max(dot(N, H), 0.0), 18.0)*0.06*sh;
    return col*mix(0.84, 1.0, ao);
  }
  if (abs(mat - 46.0) < 0.5 || abs(mat - 47.0) < 0.5) {
    vec3 R = reflect(rd, N);
    float wrap = clamp((dot(N, L) + 0.4)/1.4, 0.0, 1.0)*mix(1.0, sh, 0.6);
    float peak = step(46.5, mat);
    vec3 col = mix(mix(vec3(0.05, 0.08, 0.2), vec3(0.2, 0.28, 0.5), wrap), mix(vec3(0.02, 0.03, 0.07), vec3(0.12, 0.15, 0.26), wrap), peak);
    col += vec3(1.0)*pow(max(dot(R, L), 0.0), mix(24.0, 60.0, peak))*mix(0.15, 0.8, peak)*sh + vec3(0.6, 0.7, 1.0)*fres*mix(0.12, 0.3, peak);
    return col*mix(0.8, 1.0, ao);
  }
  if (abs(mat - 48.0) < 0.5) {
    vec3 R = reflect(rd, N);
    float wrapG = clamp((dot(N, L) + 0.3)/1.3, 0.0, 1.0);
    vec3 col = mix(vec3(0.86, 0.6, 0.2), vec3(1.0, 0.86, 0.46), wrapG);
    col = mix(col, vec3(1.0, 0.95, 0.78), smoothstep(0.55, 1.0, R.y)*0.35);
    col += vec3(1.0, 0.97, 0.88)*pow(max(dot(R, L), 0.0), 40.0)*0.8 + vec3(1.0, 0.9, 0.6)*fres*0.25;
    return col*mix(0.85, 1.0, ao);
  }
#endif
#if PROP == 15 || defined(ALLMATS)
  if (abs(mat - 49.0) < 0.5) {
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0);
    vec3 col = mix(vec3(0.08, 0.08, 0.1), vec3(0.28, 0.28, 0.32), wrap*mix(1.0, sh, 0.7));
    col += vec3(1.0)*pow(max(dot(N, H), 0.0), 30.0)*0.12*sh;
    return col*mix(0.8, 1.0, ao);
  }
  if (abs(mat - 50.0) < 0.5 || abs(mat - 51.0) < 0.5) {
    float rim = step(50.5, mat);
    float wrap = clamp((dot(N, L) + 0.45)/1.45, 0.0, 1.0)*mix(1.0, sh, 0.6);
    vec3 col = mix(mix(vec3(0.74, 0.78, 0.86), vec3(0.97, 0.98, 1.0), wrap), mix(vec3(0.5, 0.53, 0.6), vec3(0.78, 0.8, 0.86), wrap), rim);
    col += vec3(1.0)*pow(max(dot(N, H), 0.0), 26.0)*0.14*sh + vec3(0.85, 0.9, 1.0)*fres*0.1;
    return col*mix(0.85, 1.0, ao);
  }
#endif
#if PROP == 16 || defined(ALLMATS)
  if (abs(mat - 52.0) < 0.5 || abs(mat - 54.0) < 0.5) {
    vec3 R = reflect(rd, N);
    float wrap = clamp((dot(N, L) + 0.4)/1.4, 0.0, 1.0)*mix(1.0, sh, 0.6);
    float white = step(53.5, mat);
    vec3 col = mix(mix(vec3(0.46, 0.48, 0.53), vec3(0.88, 0.89, 0.93), wrap), mix(vec3(0.84, 0.84, 0.87), vec3(1.0), wrap), white);
    col += vec3(1.0)*pow(max(dot(R, L), 0.0), 40.0)*mix(0.6, 0.2, white)*sh;
    return col*mix(0.82, 1.0, ao);
  }
  if (abs(mat - 53.0) < 0.5) {
    vec3 R = reflect(rd, N);
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0)*mix(1.0, sh, 0.7);
    vec3 col = mix(vec3(0.6, 0.04, 0.06), vec3(0.96, 0.2, 0.17), wrap);
    col += vec3(1.0, 0.85, 0.85)*pow(max(dot(R, L), 0.0), 50.0)*0.45*sh + vec3(1.0, 0.6, 0.6)*fres*0.15;
    return col*mix(0.82, 1.0, ao);
  }
#endif
#if PROP == 17 || defined(ALLMATS)
  if (abs(mat - 55.0) < 0.5 || abs(mat - 56.0) < 0.5) {
    float wrap = clamp((dot(N, L) + 0.35)/1.35, 0.0, 1.0)*mix(1.0, sh, 0.7);
    vec3 col = mix(vec3(0.05, 0.045, 0.06), vec3(0.25, 0.22, 0.25), wrap) + vec3(0.06)*uDarkFloor;
    col += vec3(1.0)*pow(max(dot(N, H), 0.0), 36.0)*0.22*sh + vec3(0.8, 0.8, 0.9)*fres*(0.12 + 0.4*uDarkFloor);
    return col*mix(0.8, 1.0, ao);
  }
#endif
  float wrap = clamp((dot(N, L) + 0.4)/1.4, 0.0, 1.0);
  vec3 col = mix(vec3(0.82, 0.42, 0.52), vec3(1.0, 0.72, 0.78), wrap*mix(1.0, sh, 0.7));
  return col*mix(0.78, 1.0, ao);
}
#ifndef MESH
vec3 shade(vec3 pos, vec3 rd, float mat){
  vec3 N = calcNormal(pos);
  vec3 L = normalize(vec3(-0.55, 0.78, 0.6));
  return shadeWith(N, toObject(pos), rd, softShadow(pos + N*0.01, L), calcAO(pos, N), mat);
}
#endif

`

const f = n => n.toFixed(3)
const weights = ([n, w, l]) => `near*${f(n)} + wide*${f(w)} + lean*${f(l)}`

export const GSHADOW = `vec4 groundShadow(vec3 gp){
  vec2 g = rot(uYaw)*gp.xz;
  float sx = 1.0 + 0.05*uSquash + 0.18*uDead;
  vec2 foot = uFoot*sx;
  float lift = clamp(uLift*6.0, 0.0, 1.0);
  vec2 q = g/foot;
  float r2 = dot(q, q);
  float past = max(sqrt(r2) - ${f(SHADOW.rim)}, 0.0);
  float near = exp(-past*past*${f(SHADOW.near)})*(1.0 - lift*0.8);
  float wide = exp(-r2*${f(SHADOW.wide)})*(1.0 - lift*0.4);
  vec2 g2 = (g - vec2(0.14, -0.12))/(foot*1.06);
  float lean = exp(-dot(g2, g2)*${f(SHADOW.lean)});
  float edge = 1.0 - smoothstep(1.02, 1.3, length(gp.xz*vec2(1.0, 1.15)));
  float a = (${weights(SHADOW.light)})*edge;
  vec3 tint = mix(cDeep, vec3(0.16, 0.13, 0.19), 0.4);
  vec4 onLight = vec4(tint*0.6*a, a);
  float pool = exp(-dot(gp.xz, gp.xz)*2.4)*edge*${f(SHADOW.pool)}*(1.0 - uSmall);
  float core = (${weights(SHADOW.dark)})*edge;
  vec4 onDark = vec4(vec3(0.88, 0.88, 0.92)*pool*(1.0 - core), pool + core - pool*core);
  return mix(onLight, onDark, uDarkFloor);
}

`

export const RENDER = `vec4 render(vec2 frag){
  vec2 uv = (frag - 0.5*uRes)/uRes.y;
  vec3 ro = vec3(0.0, 0.32, 7.6);
  vec3 ta = vec3(0.0, 0.12, 0.0);
  vec3 ww = normalize(ta - ro), uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0))), vv = cross(uu, ww);
  const float FOCAL = 2.55;
  vec3 rd = normalize(uv.x*uu + uv.y*vv + FOCAL*ww);
  float pix = 1.0/(uRes.y*FOCAL);
  float tg = (GROUND - 0.001 - ro.y)/rd.y;
  vec4 bg = tg > 0.0 ? groundShadow(ro + rd*tg) : vec4(0.0);
  vec3 oc = ro - vec3(0.1, 0.18, 0.0);
  float b = dot(oc, rd), c = dot(oc, oc) - 1.8*1.8, disc = b*b - c;
  if (disc < 0.0) return bg;
  float sq = sqrt(disc);
  float t = max(-b - sq, 0.0), tEnd = -b + sq;
  float m = -1.0, minH = 1e9, tMin = t, mMin = 1.0;
  for (int i = 0; i < 90; i++) {
    vec2 h = map(ro + rd*t);
    if (h.x < 0.0006*t) {
      m = h.y;
      break;
    }
    if (h.x/t < minH) {
      minH = h.x/t;
      tMin = t;
      mMin = h.y;
    }
    t += h.x;
    if (t > tEnd) break;
  }
  float cover = m > 0.0 ? 1.0 : 1.0 - smoothstep(0.0, 1.35*pix, minH);
  if (cover < 0.002) return bg;
  float ts = m > 0.0 ? t : tMin;
  if (tg > 0.0 && ts > tg) return bg;
  vec3 col = shade(ro + rd*ts, rd, m > 0.0 ? m : mMin);
  return vec4(col*cover, cover) + bg*(1.0 - cover);
}

void main(){
  outColor = render(gl_FragCoord.xy);
}`
