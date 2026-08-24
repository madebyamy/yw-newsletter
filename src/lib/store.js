// Talks to the Netlify function when it is available, and falls back to this
// browser's localStorage when it is not (plain `npm run dev`, a deploy where
// the environment variables are not set yet, or simply being offline).
//
// Every write is additive at section level: saving one section never touches
// the others, and nothing already stored is cleared unless someone explicitly
// clears that field in the editor.

const API = '/api/newsletter'
const LOCAL_PREFIX = 'yw-newsletter:'
const LOCAL_PASSCODE = import.meta.env.VITE_LOCAL_PASSCODE || 'yw2026'

export const MODE = { CLOUD: 'cloud', LOCAL: 'local' }

// ------------------------------------------------------------------ transport

// Distinguishes "our function answered" from "there is no function here".
// A dev server or a stray proxy answers /api/* with an HTML page, which is
// not a rejected fetch and not a 503 — without this check that HTML would be
// misread as a refusal and reported to the user as a wrong passcode.
async function call(method, { path = '', payload } = {}) {
  let res
  try {
    res = await fetch(API + path, {
      method,
      ...(payload
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
        : {}),
    })
  } catch {
    return { kind: 'unavailable' }
  }

  const json = await res.json().catch(() => null)
  const isOurs = json !== null && typeof json === 'object' && 'ok' in json

  if (!isOurs) return { kind: 'unavailable' }
  if (res.status === 503) return { kind: 'unavailable' }
  if (res.status === 401) return { kind: 'unauthorized', json }
  if (!res.ok) return { kind: 'error', json }
  return { kind: 'ok', json }
}

// ------------------------------------------------------------------ reads

export async function loadIssue(monthKey) {
  const result = await call('GET', { path: `?month=${encodeURIComponent(monthKey)}` })
  const local = readLocal(monthKey)

  if (result.kind === 'ok') {
    return {
      mode: MODE.CLOUD,
      // If this browser has local edits from before the backend was wired up,
      // they still show — the shared copy just takes precedence.
      raw: result.json.data ?? local?.raw ?? null,
      updatedAt: result.json.updatedAt,
      updatedBy: result.json.updatedBy,
    }
  }

  return {
    mode: MODE.LOCAL,
    raw: local?.raw ?? null,
    updatedAt: local?.updatedAt ?? null,
    updatedBy: local?.updatedBy ?? null,
  }
}

// ------------------------------------------------------------------ auth

export async function verifyPasscode(passcode) {
  const result = await call('POST', { payload: { action: 'verify', passcode } })

  if (result.kind === 'ok') return { ok: true, mode: MODE.CLOUD }
  if (result.kind === 'unauthorized') {
    return { ok: false, error: result.json.error || 'That passcode is not right.' }
  }
  if (result.kind === 'error') {
    return { ok: false, error: result.json.error || 'Could not check that passcode.' }
  }
  return localVerify(passcode)
}

function localVerify(passcode) {
  if (passcode === LOCAL_PASSCODE) return { ok: true, mode: MODE.LOCAL }
  return { ok: false, error: 'That passcode is not right.' }
}

// ------------------------------------------------------------------ writes

export async function saveSection({ monthKey, sectionId, value, editor, passcode }) {
  const result = await call('POST', {
    payload: { action: 'save', month: monthKey, sectionId, value, editor, passcode },
  })

  if (result.kind === 'ok') {
    return {
      ok: true,
      mode: MODE.CLOUD,
      raw: result.json.data,
      updatedAt: result.json.updatedAt,
      updatedBy: result.json.updatedBy,
    }
  }
  if (result.kind === 'unauthorized') {
    return { ok: false, error: result.json.error || 'That passcode is not right.' }
  }
  if (result.kind === 'error') {
    return { ok: false, error: result.json.error || 'Could not save that section.' }
  }

  return saveSectionLocally({ monthKey, sectionId, value, editor })
}

function saveSectionLocally({ monthKey, sectionId, value, editor }) {
  const existing = readLocal(monthKey)?.raw ?? {}
  const editorName = String(editor || '').slice(0, 80) || 'Someone'
  const savedAt = new Date().toISOString()

  const merged = {
    ...existing,
    [sectionId]: value,
    _meta: { ...(existing._meta || {}), [sectionId]: { by: editorName, at: savedAt } },
  }

  try {
    localStorage.setItem(
      LOCAL_PREFIX + monthKey,
      JSON.stringify({ raw: merged, updatedAt: savedAt, updatedBy: editorName }),
    )
  } catch (err) {
    return { ok: false, error: 'Could not save to this browser: ' + err.message }
  }

  return { ok: true, mode: MODE.LOCAL, raw: merged, updatedAt: savedAt, updatedBy: editorName }
}

// ------------------------------------------------------------------ local

function readLocal(monthKey) {
  try {
    const text = localStorage.getItem(LOCAL_PREFIX + monthKey)
    if (!text) return null
    const parsed = JSON.parse(text)
    // Guard against a half-written or hand-edited entry — never throw away
    // what is there, just decline to use a shape we do not recognise.
    if (!parsed || typeof parsed !== 'object' || typeof parsed.raw !== 'object') return null
    return parsed
  } catch {
    return null
  }
}
