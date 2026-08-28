import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PageOne, PageTwo } from './components/Newsletter'
import Editor from './components/Editor'
import { SEEDS, currentMonthKey, monthLabel, normalizeIssue, shiftMonth } from './data/issues'
import { listMonths, loadIssue, saveSection, verifyPasscode, MODE } from './lib/store'
import './styles/app.css'
import './styles/newsletter.css'

const PAGE_W = 8.5 * 96
const PAGE_H = 11 * 96
// Below this width the fixed 8.5in sheet would shrink past readability, so
// the page reflows instead of scaling. Laptop and print are unaffected.
const PHONE_MAX = 820
const PHONE_QUERY = `(max-width: ${PHONE_MAX}px)`
const LEADER_KEY = 'yw-newsletter:leader'

// The Edit button is hidden unless this browser is a leader's. That is a
// tidiness measure, not a security one — the passcode in the Netlify function
// is what actually protects editing, and it is checked server-side.
function initialLeaderMode() {
  if (new URLSearchParams(window.location.search).has('edit')) {
    try {
      localStorage.setItem(LEADER_KEY, 'true')
    } catch {
      // Private browsing — the flag just will not persist past this visit.
    }
    return true
  }
  try {
    return localStorage.getItem(LEADER_KEY) === 'true'
  } catch {
    return false
  }
}
const NAME_KEY = 'yw-newsletter:editor-name'
// Keeps a leader signed in between visits. This is the shared editing
// passcode, not a personal password, and Log out clears it — but it does mean
// a shared computer stays unlocked until someone logs out.
const AUTH_KEY = 'yw-newsletter:auth'

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.passcode === 'string' ? parsed : null
  } catch {
    return null
  }
}

function initialMonth() {
  const fromUrl = new URLSearchParams(window.location.search).get('month')
  if (fromUrl && /^\d{4}-(0[1-9]|1[0-2])$/.test(fromUrl)) return fromUrl

  const now = currentMonthKey()
  if (SEEDS[now]) return now

  // Nothing for this month yet — open the newest issue we have content for.
  const seeded = Object.keys(SEEDS).sort()
  return seeded.length ? seeded[seeded.length - 1] : now
}

export default function App() {
  const [monthKey, setMonthKey] = useState(initialMonth)
  const [raw, setRaw] = useState(null)
  const [mode, setMode] = useState(MODE.LOCAL)
  const [loading, setLoading] = useState(true)

  const [editorOpen, setEditorOpen] = useState(false)
  const storedAuth = useMemo(() => readStoredAuth(), [])
  const [unlocked, setUnlocked] = useState(() => Boolean(storedAuth))
  const [editorName, setEditorName] = useState(
    () => readStoredAuth()?.name || localStorage.getItem(NAME_KEY) || '',
  )
  const passcodeRef = useRef(readStoredAuth()?.passcode || '')

  const [copied, setCopied] = useState(null)
  const [preview, setPreview] = useState(null)
  const [leaderMode, setLeaderMode] = useState(initialLeaderMode)
  const [months, setMonths] = useState(null)

  // The months a reader is allowed to reach. Leaders navigate freely so they
  // can build next month before anyone else sees it.
  const publishedMonths = useMemo(
    () => (months || []).filter((m) => m.published).map((m) => m.month).sort(),
    [months],
  )

  const isPublished = useMemo(
    () => publishedMonths.includes(monthKey),
    [publishedMonths, monthKey],
  )

  const refreshMonths = useCallback(async () => {
    const result = await listMonths()
    if (result.ok) setMonths(result.months)
  }, [])

  useEffect(() => {
    refreshMonths()
  }, [refreshMonths])

  // A reader who lands on an unfinished month is moved to the newest finished
  // one rather than being shown a blank page.
  useEffect(() => {
    if (leaderMode || months === null) return
    if (publishedMonths.length === 0) return
    if (publishedMonths.includes(monthKey)) return
    setMonthKey(publishedMonths[publishedMonths.length - 1])
  }, [leaderMode, months, publishedMonths, monthKey])

  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY)
    const onChange = (e) => setIsPhone(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // ---------------------------------------------------------------- load

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadIssue(monthKey).then((result) => {
      if (cancelled) return
      setRaw(result.raw)
      setMode(result.mode)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [monthKey])

  // Keep the URL in step so the link someone copies opens the same issue.
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('month', monthKey)
    window.history.replaceState({}, '', url)
  }, [monthKey])

  const savedIssue = useMemo(() => normalizeIssue(raw, monthKey), [raw, monthKey])

  // What the sheets render: the saved issue, with any in-progress section
  // laid over the top.
  const issue = useMemo(
    () => (preview ? { ...savedIssue, [preview.id]: preview.value } : savedIssue),
    [savedIssue, preview],
  )
  const meta = raw?._meta || {}

  // ---------------------------------------------------------------- scale

  const previewRef = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return
    const measure = () => {
      // Re-checked on every resize, not just on the media-query change event:
      // dragging a desktop window narrow has to reflow too, and some browsers
      // do not fire that event for programmatic viewport changes.
      const phone = window.matchMedia(PHONE_QUERY).matches
      setIsPhone(phone)

      // A phone page reflows to full width, so no scaling is applied.
      if (phone) {
        setScale(1)
        return
      }
      const available = el.clientWidth - 24
      setScale(Math.min(1, Math.max(0.25, available / PAGE_W)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Each sheet clips anything past 11in, so warn while there is still time to
  // trim rather than letting a sentence vanish on the way to the printer.
  const [overflow, setOverflow] = useState([])

  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return
    const next = isPhone
      ? []
      : [...el.querySelectorAll('.page')].map((p) => Math.max(0, p.scrollHeight - p.clientHeight))
    setOverflow((prev) =>
      prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next,
    )
  }, [issue, loading, scale, isPhone])

  // ---------------------------------------------------------------- actions

  const handleUnlock = useCallback(async ({ name, passcode }) => {
    const result = await verifyPasscode(passcode)
    if (!result.ok) return result
    passcodeRef.current = passcode
    setEditorName(name)
    try {
      localStorage.setItem(NAME_KEY, name)
      localStorage.setItem(AUTH_KEY, JSON.stringify({ name, passcode }))
    } catch {
      // Private browsing — they will just sign in again next visit.
    }
    setUnlocked(true)
    if (result.mode) setMode(result.mode)
    return { ok: true }
  }, [])

  const handleSaveSection = useCallback(
    async (sectionId, value) => {
      const result = await saveSection({
        monthKey,
        sectionId,
        value,
        editor: editorName,
        passcode: passcodeRef.current,
      })
      if (result.ok) {
        setPreview(null)
        setRaw(result.raw)
        if (result.mode) setMode(result.mode)
        // Publishing changes which months readers can reach.
        refreshMonths()
      }
      return result
    },
    [monthKey, editorName, refreshMonths],
  )

  const handleLogOut = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch {
      // Nothing stored to clear.
    }
    passcodeRef.current = ''
    setUnlocked(false)
    setEditorOpen(false)
  }, [])

  const handlePreview = useCallback((sectionId, value) => {
    setPreview(sectionId ? { id: sectionId, value } : null)
  }, [])

  // `edit` is stripped from the reader link so passing it on never reveals
  // the button, and added to the leader link so a new leader's device shows it.
  function buildLink(forLeaders) {
    const url = new URL(window.location.href)
    url.searchParams.set('month', monthKey)
    if (forLeaders) url.searchParams.set('edit', '1')
    else url.searchParams.delete('edit')
    return url.toString()
  }

  async function copyLink(forLeaders) {
    const link = buildLink(forLeaders)
    const which = forLeaders ? 'leader' : 'reader'
    try {
      await navigator.clipboard.writeText(link)
      setCopied(which)
      setTimeout(() => setCopied(null), 2200)
    } catch {
      window.prompt('Copy this link:', link)
    }
  }

  function leaveLeaderMode() {
    try {
      localStorage.removeItem(LEADER_KEY)
    } catch {
      // Nothing stored to clear.
    }
    setLeaderMode(false)
    setEditorOpen(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('edit')
    window.history.replaceState({}, '', url)
  }

  // ---------------------------------------------------------------- render

  // A reader must never see an unfinished month, even for the instant before
  // the redirect above lands.
  const readerBlocked = !leaderMode && months !== null && !isPublished

  // Leaders step month by month through everything. Readers move between the
  // published issues only, so an empty month is never reachable.
  function canStep(delta) {
    if (leaderMode) return true
    if (publishedMonths.length === 0) return false
    const i = publishedMonths.indexOf(monthKey)
    if (i === -1) return true
    return delta < 0 ? i > 0 : i < publishedMonths.length - 1
  }

  function step(delta) {
    if (leaderMode) {
      setMonthKey((m) => shiftMonth(m, delta))
      return
    }
    const i = publishedMonths.indexOf(monthKey)
    const next = i === -1 ? publishedMonths[publishedMonths.length - 1] : publishedMonths[i + delta]
    if (next) setMonthKey(next)
  }

  // Always set, even on a phone: the stylesheet's media query overrides both
  // with !important below 820px. Leaving them off when this state is briefly
  // stale collapses the frame to nothing, so CSS owns the phone layout and
  // these only ever describe the desktop sheet.
  const frameStyle = { width: PAGE_W * scale, height: PAGE_H * scale }
  const pageStyle = { transform: `scale(${scale})` }

  return (
    <div className="app">
      <header className="toolbar no-print">
        <div className="toolbar-brand">
          <span className="name">{issue.masthead.audience || 'Young Women'} Newsletter</span>
          <span className="sub">{issue.masthead.unit}</span>
        </div>

        <div className="month-nav">
          <button
            className="btn-icon"
            onClick={() => step(-1)}
            disabled={!canStep(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="month-label">{monthLabel(monthKey)}</span>
          <button
            className="btn-icon"
            onClick={() => step(1)}
            disabled={!canStep(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {leaderMode && (
          <span className={`mode-pill ${isPublished ? 'cloud' : 'local'}`}>
            <span className="dot" />
            {isPublished ? 'Published' : 'Draft'}
          </span>
        )}

        <span className={`mode-pill ${mode === MODE.CLOUD ? 'cloud' : 'local'}`}>
          <span className="dot" />
          {mode === MODE.CLOUD ? 'Shared' : 'This browser only'}
        </span>

        <button className="btn" onClick={() => copyLink(false)}>
          {copied === 'reader' ? 'Link copied' : 'Copy share link'}
        </button>
        <button className="btn btn-gold" onClick={() => window.print()}>
          Print / Save PDF
        </button>

        {leaderMode && (
          <>
            <button className="btn" onClick={() => copyLink(true)} title="Send this to other leaders">
              {copied === 'leader' ? 'Leader link copied' : 'Copy leader link'}
            </button>
            <button className="btn btn-primary" onClick={() => setEditorOpen(true)}>
              Edit sections
            </button>
          </>
        )}
      </header>

      {loading || months === null ? (
        <div className="loading">Loading {monthLabel(monthKey)}…</div>
      ) : readerBlocked ? (
        <div className="loading">
          {publishedMonths.length === 0 ? (
            <>
              <p>
                <strong>No issues yet.</strong>
              </p>
              <p>The newsletter will appear here as soon as the first month is ready.</p>
            </>
          ) : (
            <>
              <p>
                <strong>{monthLabel(monthKey)} is not ready yet.</strong>
              </p>
              <p>
                <button className="link-btn" onClick={() => setMonthKey(publishedMonths[publishedMonths.length - 1])}>
                  Read {monthLabel(publishedMonths[publishedMonths.length - 1])} instead
                </button>
              </p>
            </>
          )}
        </div>
      ) : (
        <main className="preview" ref={previewRef}>
          {[PageOne, PageTwo].map((Page, i) => (
            <div key={i} className="sheet">
              <div className="page-frame" style={frameStyle}>
                <div className="page-scale" style={pageStyle}>
                  <Page issue={issue} meta={meta} monthKey={monthKey} leaderMode={leaderMode} />
                </div>
              </div>
              {overflow[i] > 0 && (
                <p className="overflow-warn no-print">
                  Page {i + 1} runs past the sheet by about {Math.round(overflow[i] / 96 * 25.4)}mm.
                  Trim some text or the bottom will be cut off when it prints.
                </p>
              )}
            </div>
          ))}
        </main>
      )}

      {!leaderMode && (
        <footer className="reader-foot no-print">
          <button
            className="link-btn"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('edit', '1')
              window.location.href = url.toString()
            }}
          >
            Leaders
          </button>
        </footer>
      )}

      <Editor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        issue={savedIssue}
        meta={meta}
        monthKey={monthKey}
        monthLabel={monthLabel(monthKey)}
        mode={mode}
        unlocked={unlocked}
        editorName={editorName}
        onUnlock={handleUnlock}
        onSaveSection={handleSaveSection}
        onPreview={handlePreview}
        onLeaveLeaderMode={leaveLeaderMode}
        onLogOut={handleLogOut}
      />
    </div>
  )
}
