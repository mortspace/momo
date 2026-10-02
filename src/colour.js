import { hexToRgb } from './engine/character.js'

export const lum = hex => {
  const c = hexToRgb(hex).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export const contrast = (a, b) => {
  const x = lum(a),
    y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
