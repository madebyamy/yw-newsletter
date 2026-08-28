// Builds the month grid and works out which day each entry belongs to.
//
// Dates arrive in several shapes: "Sep 12" from the schedule sheet,
// "Sun · Sep 6" typed by a leader, "Sep 27–28" for a camp. Rather than demand
// one format, this reads the day out of whatever is written and ignores
// anything that clearly belongs to another month.

const MONTH_TOKENS = [
  ['jan'], ['feb'], ['mar'], ['apr'], ['may'], ['jun'],
  ['jul'], ['aug'], ['sep'], ['oct'], ['nov'], ['dec'],
]

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function monthIndexOf(monthKey) {
  return Number(String(monthKey).split('-')[1]) - 1
}

export function yearOf(monthKey) {
  return Number(String(monthKey).split('-')[0])
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

// "2026-09-12" -> { year, monthIndex, day }
export function parseIso(value) {
  const m = String(value || '').match(ISO)
  if (!m) return null
  return { year: Number(m[1]), monthIndex: Number(m[2]) - 1, day: Number(m[3]) }
}

// "2026-09-12" -> "Sep 12". Anything else is shown exactly as written, so a
// hand-typed "Sun · Sep 6" still reads the way it was entered.
export function formatDate(value) {
  const iso = parseIso(value)
  if (!iso) return String(value || '')
  return `${MONTH_ABBR[iso.monthIndex]} ${iso.day}`
}

// Birthdays care about the day, not the year the picker insisted on.
export function formatMonthDay(value) {
  return formatDate(value)
}

// "19:00" -> "7:00 PM"
export function formatTime(value) {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/)
  if (!m) return String(value || '')
  let hour = Number(m[1])
  const minute = m[2]
  const suffix = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${suffix}`
}

// The day number an entry falls on, or null when it cannot be placed.
// A month name that disagrees with the issue's month rules the entry out, so
// a stray "Oct 3" never lands in September's grid.
export function dayOf(text, monthIndex) {
  if (!text) return null

  // Picker values are unambiguous, and must not be read as loose text:
  // "2026-09-12" would otherwise yield 9 from the month digits.
  const iso = parseIso(text)
  if (iso) return iso.monthIndex === monthIndex ? iso.day : null

  const raw = String(text).toLowerCase()

  const named = MONTH_TOKENS.findIndex(([token]) => raw.includes(token))
  if (named !== -1 && named !== monthIndex) return null

  // Take the first 1–31 number that is not part of a year.
  const numbers = raw.match(/\d{1,4}/g)
  if (!numbers) return null
  for (const n of numbers) {
    if (n.length === 4) continue
    const value = Number(n)
    if (value >= 1 && value <= 31) return value
  }
  return null
}

// Weeks of the month, Sunday first, padded with nulls so the grid stays square.
export function monthGrid(monthKey) {
  const year = yearOf(monthKey)
  const month = monthIndexOf(monthKey)
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDay = first.getDay()

  const cells = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// Groups activities and birthdays onto the days they fall on.
export function entriesByDay({ events = [], birthdays = [], monthKey }) {
  const monthIndex = monthIndexOf(monthKey)
  const byDay = new Map()

  const add = (day, entry) => {
    if (!day) return
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day).push(entry)
  }

  for (const b of birthdays) {
    const day = dayOf(b.date, monthIndex)
    if (day && b.name) add(day, { kind: 'birthday', label: b.name })
  }
  for (const e of events) {
    const day = dayOf(e.date, monthIndex)
    if (day && e.title) add(day, { kind: 'activity', label: e.title })
  }

  return byDay
}
