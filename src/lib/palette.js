// Turns a background image into (a) a small, print-sized copy to store and
// (b) a palette derived from its dominant colours.
//
// The rule the whole thing rests on: every tinted card stays light enough for
// near-black text, and the one strong "feature" colour is forced dark enough
// for white text. That way contrast is safe no matter what image is uploaded.

// Reads a stored number, treating null/undefined/'' as "not set".
// Number(null) is 0 and passes Number.isFinite, so a plain isFinite check
// silently turns an unset opacity into a fully invisible background.
export function numberOr(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// ---------------------------------------------------------------- colour math

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s, l]
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [
    Math.round(hue(h + 1 / 3) * 255),
    Math.round(hue(h) * 255),
    Math.round(hue(h - 1 / 3) * 255),
  ]
}

const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')

const hsl = (h, s, l) => toHex(hslToRgb(h, s, l))

// Relative luminance, for deciding whether text on a colour should be dark.
function luminance([r, g, b]) {
  const f = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrastRatio(hexA, hexB) {
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const a = luminance(parse(hexA))
  const b = luminance(parse(hexB))
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

// ---------------------------------------------------------------- extraction

// Counts colours in a downsampled copy and returns the dominant hues, most
// common first, skipping near-white paper and near-black line work.
function dominantColors(imageData) {
  const { data } = imageData
  const bins = new Map()
  let lightest = null

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const [h, s, l] = rgbToHsl(r, g, b)

    if (l > 0.86 && (lightest === null || l > lightest[2])) lightest = [h, s, l]

    // Ignore paper and ink; we want the decorative colours.
    if (l > 0.9 || l < 0.12 || s < 0.12) continue

    const key = `${Math.round(h / 12)}|${Math.round(s * 5)}|${Math.round(l * 6)}`
    const entry = bins.get(key)
    if (entry) {
      entry.count += 1
      entry.h += h; entry.s += s; entry.l += l
    } else {
      bins.set(key, { count: 1, h, s, l })
    }
  }

  const ranked = [...bins.values()]
    .map((e) => ({ count: e.count, h: e.h / e.count, s: e.s / e.count, l: e.l / e.count }))
    .sort((a, b) => b.count - a.count)

  // Keep hues that are visibly different from each other.
  const picked = []
  for (const c of ranked) {
    const clash = picked.some((p) => {
      const d = Math.abs(p.h - c.h)
      return Math.min(d, 360 - d) < 22
    })
    if (!clash) picked.push(c)
    if (picked.length >= 5) break
  }

  return { picked, lightest }
}

// ---------------------------------------------------------------- palette

// Everything the page needs, as plain hex, safe for print.
export function derivePalette(picked, lightest) {
  if (!picked || picked.length === 0) return null

  const accents = [...picked]
  while (accents.length < 4) accents.push(accents[accents.length % picked.length])

  // Paper: the image's own light tone, pushed almost to white so text sits on it.
  const canvasHue = lightest ? lightest[0] : accents[0].h
  const canvasSat = Math.min(lightest ? lightest[1] : 0.12, 0.18)
  const canvas = hsl(canvasHue, canvasSat, 0.975)
  const surfaceCard = hsl(canvasHue, Math.min(canvasSat + 0.06, 0.22), 0.945)
  const hairline = hsl(canvasHue, Math.min(canvasSat + 0.04, 0.18), 0.87)

  // Ink from the deepest accent, darkened hard so body text stays readable.
  const deepest = [...accents].sort((a, b) => a.l - b.l)[0]
  const ink = hsl(deepest.h, Math.min(deepest.s * 0.55, 0.35), 0.13)
  const body = hsl(deepest.h, Math.min(deepest.s * 0.4, 0.25), 0.3)
  // 0.40 rather than something lighter: this drives the small caption text,
  // which still has to clear 4.5:1 against the near-white canvas.
  const muted = hsl(deepest.h, Math.min(deepest.s * 0.3, 0.2), 0.4)

  // Light tints for the cards — always pale enough for ink text.
  const tints = accents.slice(0, 4).map((c) => hsl(c.h, Math.min(c.s * 0.75, 0.5), 0.9))

  // Slightly stronger versions for the small pills.
  const pills = accents.slice(0, 4).map((c) => hsl(c.h, Math.min(c.s * 0.85, 0.6), 0.78))

  // The one strong band (the scripture card) — forced dark for white text.
  // Prefer the colour that actually dominates the image, as long as it has
  // enough saturation to read as a colour rather than a grey; a rare but very
  // saturated accent would otherwise hijack the whole page.
  const byPresence = [...accents].sort((a, b) => (b.count || 0) - (a.count || 0))
  const strongest =
    byPresence.find((c) => c.s >= 0.2) ||
    [...accents].sort((a, b) => b.s - a.s)[0]
  const featureBg = hsl(strongest.h, Math.min(Math.max(strongest.s, 0.25), 0.55), 0.22)

  return {
    canvas,
    surfaceCard,
    hairline,
    ink,
    body,
    muted,
    tints,
    pills,
    featureBg,
    featureFg: '#ffffff',
  }
}

// Maps a palette onto the CSS custom properties the page reads.
export function paletteToStyle(palette, opacity) {
  if (!palette) return {}
  // A row saved by an older version, or edited by hand, may not carry these.
  // Falling back beats destructuring undefined and blanking the whole page.
  const [t1, t2, t3, t4] = palette.tints || []
  const [p1, p2, p3, p4] = palette.pills || []
  return {
    '--canvas': palette.canvas,
    '--surface-card': palette.surfaceCard,
    '--surface-soft': palette.surfaceCard,
    '--hairline': palette.hairline,
    '--hairline-soft': palette.hairline,
    '--ink': palette.ink,
    '--body': palette.body,
    '--muted': palette.muted,
    '--muted-soft': palette.muted,
    '--tint-1': t1,
    '--tint-2': t2,
    '--tint-3': t3,
    '--tint-4': t4,
    '--pill-1': p1,
    '--pill-2': p2,
    '--pill-3': p3,
    '--pill-4': p4,
    '--feature-bg': palette.featureBg,
    '--feature-fg': palette.featureFg,
    '--bg-opacity': String(opacity ?? 0.12),
  }
}

// ---------------------------------------------------------------- image prep

const MAX_EDGE = 1400
const QUALITY = 0.78

// Shrinks and re-encodes an uploaded image. Everything stored with an issue
// goes through here: a phone photo is several megabytes, and both the printed
// background and the portrait frame are far smaller than the original.
export function prepareImage(file, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('That is not an image file.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That image could not be opened.'))
      img.onload = () => {
        try {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scale))
          const h = Math.max(1, Math.round(img.height * scale))

          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          const dataUrl = canvas.toDataURL('image/jpeg', quality)

          resolve({
            dataUrl,
            image: img,
            width: w,
            height: h,
            approxKb: Math.round((dataUrl.length * 0.75) / 1024),
          })
        } catch (err) {
          reject(new Error('Could not process that image: ' + err.message))
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// A background image also supplies the page's colours.
export async function prepareBackground(file) {
  const prepared = await prepareImage(file)

  // Sample from a small copy — faster, and it smooths out speckle.
  const sw = 90
  const sh = Math.max(1, Math.round((prepared.height / prepared.width) * sw))
  const small = document.createElement('canvas')
  small.width = sw
  small.height = sh
  const sctx = small.getContext('2d')
  sctx.drawImage(prepared.image, 0, 0, sw, sh)

  const { picked, lightest } = dominantColors(sctx.getImageData(0, 0, sw, sh))
  const palette = derivePalette(picked, lightest)
  if (!palette) {
    throw new Error('That image has no colour to work with — try a different one.')
  }

  return { ...prepared, palette }
}
