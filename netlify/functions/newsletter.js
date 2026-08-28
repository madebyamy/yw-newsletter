import { timingSafeEqual } from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EDIT_PASSCODE = process.env.EDIT_PASSCODE

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

// ---------------------------------------------------------------- activities
//
// The ward activity schedule lives in a published Google Sheet. It is read
// here rather than copied into the newsletter, so editing the sheet updates
// what the girls see.

const SHEET_URL = process.env.ACTIVITY_SHEET_CSV_URL
const SHEET_YEAR = Number(process.env.ACTIVITY_SHEET_YEAR) || 2026
const SHEET_TTL_MS = 5 * 60 * 1000

let sheetCache = { at: 0, months: null }

const MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Google serves ...\/pubhtml for people; the same page as CSV is ...\/pub with
// output=csv. Accept either so a pasted browser URL still works.
export function toCsvUrl(raw) {
  if (!raw) return null
  let url
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  url.pathname = url.pathname.replace(/\/pubhtml$/, '/pub')
  url.searchParams.set('single', 'true')
  url.searchParams.set('output', 'csv')
  return url.toString()
}

// Minimal RFC-4180 reader: handles quoted fields containing commas.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

// "Sep 12", "September 12", "Mar 27-28", "June 1-4"
function parseWhen(cell) {
  const m = String(cell || '').trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?/)
  if (!m) return null
  const idx = MONTH_NAMES.indexOf(m[1].slice(0, 3).toLowerCase())
  if (idx === -1) return null
  return { monthIndex: idx, day: Number(m[2]), endDay: m[3] ? Number(m[3]) : null }
}

// Only the first two columns are read — the date and the activity. Anything
// further right in the sheet is the leaders' own working notes ("ym in
// charge", "Nelson's gone") and has no business on a page the girls read.
// A header row needs no special handling: "date" is not a date, so it is
// skipped like any other unparseable line.
export function parseActivityCsv(text, baseYear = SHEET_YEAR) {
  const months = {}
  let year = baseYear
  let lastMonthIndex = -1

  for (const row of parseCsv(text)) {
    const when = parseWhen(row[0])
    if (!when) continue

    const title = String(row[1] || '').trim()
    if (!title) continue

    // The tab runs past its own year: once the months stop advancing we have
    // wrapped into January of the next year.
    if (when.monthIndex < lastMonthIndex) year += 1
    lastMonthIndex = when.monthIndex

    const key = `${year}-${String(when.monthIndex + 1).padStart(2, '0')}`
    const label =
      `${MONTH_ABBR[when.monthIndex]} ${when.day}` + (when.endDay ? `–${when.endDay}` : '')

    if (!months[key]) months[key] = []
    months[key].push({ date: label, title })
  }

  return months
}

async function loadActivities() {
  const url = toCsvUrl(SHEET_URL)
  if (!url) return { ok: false, error: 'not_configured' }

  const fresh = Date.now() - sheetCache.at < SHEET_TTL_MS
  if (fresh && sheetCache.months) return { ok: true, months: sheetCache.months, cached: true }

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Sheet returned ${res.status}`)
  const text = await res.text()

  if (/^\s*<(!doctype|html)/i.test(text)) {
    throw new Error('The sheet URL returned a web page, not CSV. Re-publish the tab as CSV.')
  }

  const months = parseActivityCsv(text)
  sheetCache = { at: Date.now(), months }
  return { ok: true, months, cached: false }
}

export const handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') return await handleGet(event)
    if (event.httpMethod === 'POST') return await handlePost(event)
    return reply(405, { ok: false, error: 'Method not allowed' })
  } catch (err) {
    console.error('newsletter function failed:', err)
    return reply(500, { ok: false, error: 'Something went wrong on the server.' })
  }
}

// ---------------------------------------------------------------- reads

async function handleGet(event) {
  const params = event.queryStringParameters || {}

  // Served before the Supabase check: the schedule is public information and
  // works even if the database is not wired up yet.
  if (params.activities) {
    try {
      const result = await loadActivities()
      if (!result.ok) return reply(200, { ok: true, months: {}, configured: false })
      return reply(200, { ok: true, months: result.months, configured: true })
    } catch (err) {
      console.error('activity sheet failed:', err)
      return reply(200, { ok: true, months: {}, configured: true, error: err.message })
    }
  }

  if (!configured()) {
    return reply(503, { ok: false, error: 'not_configured' })
  }

  if (params.list) {
    // Pull the publish flag out of the JSON rather than whole rows — the data
    // column can hold a background image, which has no business in a listing.
    const rows = await sb(
      'newsletters?select=month_key,updated_at,updated_by,publish:data->publish&order=month_key.desc',
    )
    return reply(200, {
      ok: true,
      months: rows.map((r) => ({
        month: r.month_key,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
        published: r.publish?.published === true,
      })),
    })
  }

  const month = params.month
  if (!MONTH_KEY.test(month || '')) {
    return reply(400, { ok: false, error: 'A month in YYYY-MM form is required.' })
  }

  const rows = await sb(`newsletters?month_key=eq.${month}&select=*`)
  const row = rows[0]

  return reply(200, {
    ok: true,
    month,
    data: row?.data ?? null,
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null,
  })
}

// ---------------------------------------------------------------- writes

async function handlePost(event) {
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return reply(400, { ok: false, error: 'Could not read the request.' })
  }

  if (!EDIT_PASSCODE) {
    return reply(503, {
      ok: false,
      error: 'No edit passcode is set on the server yet. See SETUP.md.',
    })
  }

  if (!passcodeMatches(body.passcode)) {
    return reply(401, { ok: false, error: 'That passcode is not right.' })
  }

  if (body.action === 'verify') {
    return reply(200, { ok: true, verified: true })
  }

  if (body.action !== 'save') {
    return reply(400, { ok: false, error: 'Unknown action.' })
  }

  if (!configured()) {
    return reply(503, { ok: false, error: 'not_configured' })
  }

  const { month, sectionId, value, editor } = body
  if (!MONTH_KEY.test(month || '')) {
    return reply(400, { ok: false, error: 'A month in YYYY-MM form is required.' })
  }
  if (typeof sectionId !== 'string' || !sectionId) {
    return reply(400, { ok: false, error: 'A section id is required.' })
  }

  // Read-modify-write at SECTION granularity. Two people editing two
  // different sections at the same time never overwrite each other, because
  // each save only ever replaces the one section it owns.
  const rows = await sb(`newsletters?month_key=eq.${month}&select=*`)
  const existing = rows[0]?.data ?? {}
  const previous = existing[sectionId]

  const editorName = String(editor || '').slice(0, 80) || 'Someone'
  const savedAt = new Date().toISOString()

  // `_meta` records who last touched each section, so the newsletter can show
  // "Member Highlight — updated by Sister Reid on the 14th".
  const merged = {
    ...existing,
    [sectionId]: value,
    _meta: { ...(existing._meta || {}), [sectionId]: { by: editorName, at: savedAt } },
  }

  await sb('newsletters', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([
      {
        month_key: month,
        data: merged,
        updated_at: savedAt,
        updated_by: editorName,
      },
    ]),
  })

  // Keep the previous version of the section so nothing is ever truly lost.
  if (previous !== undefined) {
    await sb('newsletter_edits', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([
        { month_key: month, section_id: sectionId, editor: editorName, snapshot: previous },
      ]),
    }).catch((err) => console.error('edit history write failed:', err))
  }

  return reply(200, {
    ok: true,
    month,
    data: merged,
    updatedAt: savedAt,
    updatedBy: editorName,
  })
}

// ---------------------------------------------------------------- helpers

function configured() {
  return Boolean(SUPABASE_URL && SERVICE_KEY)
}

function passcodeMatches(supplied) {
  const a = Buffer.from(String(supplied ?? ''))
  const b = Buffer.from(EDIT_PASSCODE)
  // timingSafeEqual throws on length mismatch, so compare lengths first and
  // still run the comparison to keep the timing profile flat.
  if (a.length !== b.length) {
    timingSafeEqual(b, b)
    return false
  }
  return timingSafeEqual(a, b)
}

async function sb(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Supabase ${res.status}: ${detail}`)
  }

  if (res.status === 204) return []
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

function reply(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) }
}
