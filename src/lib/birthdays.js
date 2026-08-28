// Reads an export from the birthday tracker and turns the Church-tagged
// entries into the rows the Calendar & Birthdays section renders.
//
// The two apps live on different origins, so they cannot share localStorage.
// The tracker writes a JSON file, this reads it, and the roster is kept here
// so later months fill in without re-picking the file.

const ROSTER_KEY = 'yw-newsletter:birthday-roster'
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const CHURCH = 'Church'

// Accepts the tracker's export envelope, or a bare array of birthdays.
export function parseExport(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON. Use the Export button in the birthday tracker.')
  }

  const list = Array.isArray(data) ? data : data?.birthdays
  if (!Array.isArray(list)) {
    throw new Error('That file has no birthdays in it.')
  }

  const clean = list
    .map((b) => ({
      name: String(b?.name ?? '').trim(),
      month: Number(b?.month),
      day: Number(b?.day),
      category: String(b?.category ?? '').trim(),
    }))
    .filter(
      (b) =>
        b.name &&
        Number.isInteger(b.month) &&
        b.month >= 0 &&
        b.month <= 11 &&
        Number.isInteger(b.day) &&
        b.day >= 1 &&
        b.day <= 31,
    )

  if (clean.length === 0) {
    throw new Error('No usable birthdays found in that file.')
  }
  return clean
}

// Only the ones tagged Church belong in a Young Women newsletter.
export function churchOnly(birthdays) {
  return birthdays.filter((b) => b.category.toLowerCase() === CHURCH.toLowerCase())
}

export function monthIndexOf(monthKey) {
  return Number(String(monthKey).split('-')[1]) - 1
}

// The rows the newsletter stores: { date: "Sep 14", name: "Ellie Hansen" }
export function rowsForMonth(roster, monthKey) {
  const monthIndex = monthIndexOf(monthKey)
  return roster
    .filter((b) => b.month === monthIndex)
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name))
    .map((b) => ({ date: `${MONTH_ABBR[b.month]} ${b.day}`, name: b.name }))
}

// ---------------------------------------------------------------- roster

export function saveRoster(roster) {
  try {
    localStorage.setItem(
      ROSTER_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), roster }),
    )
  } catch {
    // Storage full or blocked — the import still applies to this issue,
    // it just will not be remembered for next month.
  }
}

export function loadRoster() {
  try {
    const text = localStorage.getItem(ROSTER_KEY)
    if (!text) return null
    const parsed = JSON.parse(text)
    if (!parsed || !Array.isArray(parsed.roster) || parsed.roster.length === 0) return null
    return parsed
  } catch {
    return null
  }
}
