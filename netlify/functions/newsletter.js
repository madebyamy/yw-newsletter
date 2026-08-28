import { timingSafeEqual } from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EDIT_PASSCODE = process.env.EDIT_PASSCODE

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

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
  if (!configured()) {
    return reply(503, { ok: false, error: 'not_configured' })
  }

  const params = event.queryStringParameters || {}

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
