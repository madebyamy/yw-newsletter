import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PageOne, PageTwo } from './components/Newsletter'
import Editor from './components/Editor'
import { SEEDS, currentMonthKey, monthLabel, normalizeIssue, shiftMonth } from './data/issues'
import { loadIssue, saveSection, verifyPasscode, MODE } from './lib/store'
import './styles/app.css'
import './styles/newsletter.css'

const PAGE_W = 8.5 * 96
const PAGE_H = 11 * 96
const NAME_KEY = 'yw-newsletter:editor-name'

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
  const [unlocked, setUnlocked] = useState(false)
  const [editorName, setEditorName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const passcodeRef = useRef('')

  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState(null)

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
    const next = [...el.querySelectorAll('.page')].map((p) =>
      Math.max(0, p.scrollHeight - p.clientHeight),
    )
    setOverflow((prev) =>
      prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next,
    )
  }, [issue, loading, scale])

  // ---------------------------------------------------------------- actions

  const handleUnlock = useCallback(async ({ name, passcode }) => {
    const result = await verifyPasscode(passcode)
    if (!result.ok) return result
    passcodeRef.current = passcode
    setEditorName(name)
    localStorage.setItem(NAME_KEY, name)
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
      }
      return result
    },
    [monthKey, editorName],
  )

  const handlePreview = useCallback((sectionId, value) => {
    setPreview(sectionId ? { id: sectionId, value } : null)
  }, [])

  async function copyLink() {
    const url = new URL(window.location.href)
    url.searchParams.set('month', monthKey)
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt('Copy this link:', url.toString())
    }
  }

  // ---------------------------------------------------------------- render

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
            onClick={() => setMonthKey((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="month-label">{monthLabel(monthKey)}</span>
          <button
            className="btn-icon"
            onClick={() => setMonthKey((m) => shiftMonth(m, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <span className={`mode-pill ${mode === MODE.CLOUD ? 'cloud' : 'local'}`}>
          <span className="dot" />
          {mode === MODE.CLOUD ? 'Shared' : 'This browser only'}
        </span>

        <button className="btn" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy share link'}
        </button>
        <button className="btn btn-gold" onClick={() => window.print()}>
          Print / Save PDF
        </button>
        <button className="btn btn-primary" onClick={() => setEditorOpen(true)}>
          Edit sections
        </button>
      </header>

      {loading ? (
        <div className="loading">Loading {monthLabel(monthKey)}…</div>
      ) : (
        <main className="preview" ref={previewRef}>
          {[PageOne, PageTwo].map((Page, i) => (
            <div key={i} className="sheet">
              <div className="page-frame" style={frameStyle}>
                <div className="page-scale" style={pageStyle}>
                  <Page issue={issue} meta={meta} />
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
      />
    </div>
  )
}
