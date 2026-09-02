// One list for everything that happens in a month. Each entry carries a type,
// which decides its icon and whether it also belongs in the birthday block.
//
// Older issues stored two separate lists (events and birthdays). Those are
// still read and folded in here, so nothing written before this change is
// lost — the editor rewrites them into the single list the first time a month
// is opened and saved.

export const ENTRY_TYPES = [
  { id: 'yw', label: 'YW Activity' },
  { id: 'combined', label: 'Combined Activity' },
  { id: 'ward', label: 'Ward Activity' },
  { id: 'stake', label: 'Stake Activity' },
  { id: 'birthday', label: 'Birthday' },
  { id: 'other', label: 'Other' },
]

export const TYPE_LABEL = Object.fromEntries(ENTRY_TYPES.map((t) => [t.id, t.label]))

export function isBirthday(entry) {
  return entry?.type === 'birthday'
}

// The list to show, whichever shape the month was saved in.
//
// The empty array cannot be the test for "already converted": normalizeIssue
// creates one for every month, so that would hide old data. Once a month has
// been converted it carries a flag, and from then on an empty list genuinely
// means empty — deleting every entry does not bring the old one back.
export function readEntries(calendar) {
  const stored = Array.isArray(calendar?.entries)
    ? calendar.entries.filter((e) => e && (e.date || e.title))
    : []

  if (calendar?.entriesMigrated || stored.length > 0) return stored
  return legacyToEntries(calendar)
}

// Converts the old two-list shape into the new one.
export function legacyToEntries(calendar) {
  const events = Array.isArray(calendar?.events) ? calendar.events : []
  const birthdays = Array.isArray(calendar?.birthdays) ? calendar.birthdays : []

  return [
    ...events
      .filter((e) => e && (e.date || e.title))
      .map((e) => ({
        type: 'other',
        date: e.date || '',
        time: e.time || '',
        title: e.title || '',
        detail: e.detail || '',
      })),
    ...birthdays
      .filter((b) => b && (b.date || b.name))
      .map((b) => ({
        type: 'birthday',
        date: b.date || '',
        time: '',
        title: b.name || '',
        detail: '',
      })),
  ]
}

// True when a month still needs converting.
export function needsMigration(calendar) {
  if (calendar?.entriesMigrated) return false
  const stored = Array.isArray(calendar?.entries) ? calendar.entries : []
  if (stored.length > 0) return false
  return legacyToEntries(calendar).length > 0
}

// ------------------------------------------------------------------ colours

// Each girl keeps the same colour from month to month, because it comes from
// her name rather than her position in the list.
const NAME_COLORS = [
  'var(--name-1)',
  'var(--name-2)',
  'var(--name-3)',
  'var(--name-4)',
  'var(--name-5)',
  'var(--name-6)',
]

export function colorForName(name) {
  const text = String(name || '').trim().toLowerCase()
  if (!text) return NAME_COLORS[0]
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return NAME_COLORS[hash % NAME_COLORS.length]
}
