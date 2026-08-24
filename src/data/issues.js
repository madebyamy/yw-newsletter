import { SECTIONS, emptyValue, blankIssue } from './schema'
import september2026 from './september2026'

// Seeded issues. Add a month here once you have its curriculum outline.
export const SEEDS = {
  '2026-09': september2026,
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(monthKey) {
  const [year, month] = String(monthKey).split('-')
  const name = MONTH_NAMES[Number(month) - 1]
  return name ? `${name} ${year}` : monthKey
}

export function currentMonthKey(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function shiftMonth(monthKey, delta) {
  const [year, month] = String(monthKey).split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return currentMonthKey(d)
}

// Every field the schema knows about, filled from `stored` where present and
// from `seed` otherwise. Anything the user has already written always wins —
// this is what keeps a saved issue safe when new fields are added later.
export function normalizeIssue(stored, monthKey) {
  const seed = SEEDS[monthKey] || {}
  const result = blankIssue()

  for (const section of SECTIONS) {
    for (const field of section.fields) {
      const storedValue = stored?.[section.id]?.[field.key]
      const seedValue = seed?.[section.id]?.[field.key]

      if (hasValue(storedValue)) {
        result[section.id][field.key] = storedValue
      } else if (storedValue !== undefined) {
        // Present but empty — someone deliberately cleared it, so leave it
        // cleared rather than pulling the seed text back in.
        result[section.id][field.key] = storedValue
      } else if (hasValue(seedValue)) {
        result[section.id][field.key] = seedValue
      } else {
        result[section.id][field.key] = emptyValue(field)
      }
    }
  }

  // For an unseeded month, carry the month label across automatically.
  if (!result.masthead.monthLabel) {
    result.masthead.monthLabel = monthLabel(monthKey)
  }
  return result
}

function hasValue(v) {
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  return true
}

export { blankIssue }
