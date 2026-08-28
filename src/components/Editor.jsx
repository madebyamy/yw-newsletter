import React, { useEffect, useMemo, useState } from 'react'
import { SECTIONS, SECTION_MAP, emptyValue } from '../data/schema'
import { churchOnly, loadRoster, parseExport, rowsForMonth, saveRoster } from '../lib/birthdays'
import { numberOr, prepareBackground } from '../lib/palette'

export default function Editor({
  open,
  onClose,
  issue,
  meta,
  monthKey,
  monthLabel,
  mode,
  unlocked,
  editorName,
  onUnlock,
  onSaveSection,
  onPreview,
}) {
  const [activeId, setActiveId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Start each visit on the section list.
  useEffect(() => {
    if (!open) {
      setActiveId(null)
      setDraft(null)
      setMessage(null)
    }
  }, [open])

  const section = activeId ? SECTION_MAP[activeId] : null

  // Show unsaved edits on the page while they are being made, so visual
  // controls (background strength, colours) can be judged before saving.
  useEffect(() => {
    if (!onPreview) return
    if (section && draft) onPreview(section.id, draft)
    else onPreview(null, null)
  }, [section, draft, onPreview])

  // Drop the preview when the drawer closes, so the page shows saved state.
  useEffect(() => {
    if (!open && onPreview) onPreview(null, null)
  }, [open, onPreview])

  const dirty = useMemo(() => {
    if (!section || !draft) return false
    return JSON.stringify(draft) !== JSON.stringify(issue[section.id] ?? {})
  }, [draft, issue, section])

  function openSection(id) {
    setActiveId(id)
    // Deep copy so editing never mutates what is on screen until you save.
    setDraft(JSON.parse(JSON.stringify(issue[id] ?? {})))
    setMessage(null)
  }

  function closeSection() {
    setActiveId(null)
    setDraft(null)
    setMessage(null)
  }

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await onSaveSection(section.id, draft)
    setSaving(false)
    if (result.ok) {
      setMessage({
        kind: 'ok',
        text:
          result.mode === 'local'
            ? `Saved to this browser. ${section.label} will not reach anyone else until the backend is connected.`
            : `Saved. ${section.label} is live for everyone with the link.`,
      })
    } else {
      setMessage({ kind: 'error', text: result.error || 'Could not save.' })
    }
  }

  function handleClose() {
    if (dirty && !window.confirm('You have unsaved changes in this section. Close anyway?')) {
      return
    }
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="drawer-backdrop no-print" onClick={handleClose} />
      <aside className="drawer no-print" role="dialog" aria-label="Edit newsletter">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <h2>{section ? section.label : 'Edit this issue'}</h2>
            <p>
              {section
                ? section.hint
                : `${monthLabel} · pick a section to edit. Each one saves on its own, so several people can work at the same time.`}
            </p>
          </div>
          <button className="btn-icon" onClick={handleClose} aria-label="Close editor">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {!unlocked ? (
            <UnlockForm onUnlock={onUnlock} mode={mode} />
          ) : message ? (
            <div className={`notice ${message.kind}`}>{message.text}</div>
          ) : null}

          {unlocked && !section && (
            <div className="section-list">
              {SECTIONS.map((s) => {
                const entry = meta?.[s.id]
                return (
                  <button key={s.id} className="section-btn" onClick={() => openSection(s.id)}>
                    <span className="page-chip">P{s.page}</span>
                    <span>
                      <span className="section-name">{s.label}</span>
                      <span className="section-meta">
                        {entry?.by
                          ? `Last edited by ${entry.by}${
                              entry.at
                                ? ' · ' +
                                  new Date(entry.at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : ''
                            }`
                          : s.hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {unlocked && section && draft && (
            <div>
              {section.id === 'design' && (
                <BackgroundDesigner draft={draft} onChange={setField} />
              )}
              {section.id === 'calendar' && (
                <BirthdayImport
                  monthKey={monthKey}
                  monthLabel={monthLabel}
                  onFill={(rows) => setField('birthdays', rows)}
                />
              )}
              {section.fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={draft[field.key] ?? emptyValue(field)}
                  onChange={(v) => setField(field.key, v)}
                />
              ))}
            </div>
          )}
        </div>

        {unlocked && (
          <div className="drawer-foot">
            {section ? (
              <>
                <button className="btn" onClick={closeSection} disabled={saving}>
                  ← All sections
                </button>
                <span className="spacer" />
                <span className="saved-note">{dirty ? 'Unsaved changes' : 'Up to date'}</span>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                  {saving ? 'Saving…' : 'Save section'}
                </button>
              </>
            ) : (
              <>
                <span className="saved-note">
                  Editing as <strong>{editorName || 'Someone'}</strong>
                </span>
                <span className="spacer" />
                <button className="btn" onClick={handleClose}>
                  Done
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  )
}

// ---------------------------------------------------------------- background

const DEFAULT_OPACITY = 0.12

// Upload a pattern for the month. The palette is read from the image, so the
// cards retint themselves; removing the image restores the default scheme.
function BackgroundDesigner({ draft, onChange }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  const image = draft.backgroundImage || null
  const palette = draft.palette || null
  const opacity = numberOr(draft.backgroundOpacity, DEFAULT_OPACITY)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setNote(null)
    try {
      const result = await prepareBackground(file)
      onChange('backgroundImage', result.dataUrl)
      onChange('palette', result.palette)
      onChange('backgroundOpacity', numberOr(draft.backgroundOpacity, DEFAULT_OPACITY))
      setNote({
        kind: 'ok',
        text: `Background set (${result.approxKb} KB). Colours matched. Press Save section to keep it.`,
      })
    } catch (err) {
      setNote({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  function removeBackground() {
    onChange('backgroundImage', null)
    onChange('palette', null)
    setNote({ kind: 'info', text: 'Background removed. Save section to go back to the default colours.' })
  }

  return (
    <div className="import-panel">
      <span className="field-label">Background pattern</span>

      {note && <div className={`notice ${note.kind}`}>{note.text}</div>}

      {image ? (
        <>
          <div className="bg-preview" style={{ backgroundImage: `url(${image})` }} />

          {palette && (
            <div className="swatches" title="Colours taken from this image">
              {[palette.featureBg, ...palette.tints, ...palette.pills].map((c, i) => (
                <span key={i} className="swatch" style={{ background: c }} />
              ))}
            </div>
          )}

          <div className="field">
            <label htmlFor="bg-strength">Pattern strength — {Math.round(opacity * 100)}%</label>
            <input
              id="bg-strength"
              type="range"
              min="2"
              max="35"
              step="1"
              value={Math.round(opacity * 100)}
              onChange={(e) => onChange('backgroundOpacity', Number(e.target.value) / 100)}
            />
            <p className="import-hint">
              Keep it low so the words stay easy to read. Around 10% works well for a busy pattern.
            </p>
          </div>

          <button type="button" className="btn" onClick={removeBackground}>
            Remove background
          </button>
        </>
      ) : (
        <p className="import-hint">
          No background — the newsletter uses its default colours. Upload a pattern and the cards
          retint themselves to match it.
        </p>
      )}

      <label className={`btn btn-file${busy ? ' is-busy' : ''}`}>
        {busy ? 'Reading image…' : image ? 'Replace image' : 'Choose an image'}
        <input type="file" accept="image/*" onChange={handleFile} hidden disabled={busy} />
      </label>
    </div>
  )
}

// ---------------------------------------------------------------- birthdays

// Pulls Church-tagged birthdays out of a birthday-tracker export and fills in
// the ones falling in this issue's month. The roster is remembered, so later
// months only need one click.
function BirthdayImport({ monthKey, monthLabel, onFill }) {
  const [roster, setRoster] = useState(() => loadRoster())
  const [note, setNote] = useState(null)

  const availableThisMonth = useMemo(
    () => (roster ? rowsForMonth(roster.roster, monthKey).length : 0),
    [roster, monthKey],
  )

  function applyRoster(list, { announceImport } = {}) {
    const rows = rowsForMonth(list, monthKey)
    onFill(rows)
    setNote({
      kind: rows.length ? 'ok' : 'info',
      text: rows.length
        ? `Filled ${rows.length} ${rows.length === 1 ? 'birthday' : 'birthdays'} for ${monthLabel}. Press Save section to keep it.`
        : `No Church birthdays fall in ${monthLabel}.` +
          (announceImport ? ` ${list.length} were imported for other months.` : ''),
    })
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setNote(null)
    try {
      const list = churchOnly(parseExport(await file.text()))
      if (list.length === 0) {
        setNote({ kind: 'error', text: 'That export has no birthdays tagged Church.' })
        return
      }
      saveRoster(list)
      setRoster({ roster: list, savedAt: new Date().toISOString() })
      applyRoster(list, { announceImport: true })
    } catch (err) {
      setNote({ kind: 'error', text: err.message })
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="import-panel">
      <span className="field-label">From your birthday tracker</span>

      {note && <div className={`notice ${note.kind}`}>{note.text}</div>}

      {roster ? (
        <>
          <p className="import-hint">
            {roster.roster.length} Church {roster.roster.length === 1 ? 'birthday' : 'birthdays'} saved
            {availableThisMonth > 0
              ? ` · ${availableThisMonth} in ${monthLabel}`
              : ` · none in ${monthLabel}`}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => applyRoster(roster.roster)}
            disabled={availableThisMonth === 0}
          >
            Fill {monthLabel} birthdays
          </button>
        </>
      ) : (
        <p className="import-hint">
          Open the birthday tracker, press <strong>Export</strong>, then choose that file here. Only
          birthdays tagged <strong>Church</strong> are used.
        </p>
      )}

      <label className="btn btn-file">
        {roster ? 'Re-import updated file' : 'Choose export file'}
        <input type="file" accept=".json,application/json" onChange={handleFile} hidden />
      </label>
    </div>
  )
}

// ---------------------------------------------------------------- unlock

function UnlockForm({ onUnlock, mode }) {
  const [name, setName] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await onUnlock({ name: name.trim(), passcode })
    setBusy(false)
    if (!result.ok) setError(result.error)
  }

  return (
    <form className="unlock" onSubmit={submit}>
      <p>
        Enter the shared passcode to edit this month’s newsletter. Your name is shown next to the
        sections you change, so everyone can see who wrote what.
      </p>

      {error && <div className="notice error">{error}</div>}

      <div className="field">
        <label htmlFor="editor-name">Your name</label>
        <input
          id="editor-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sister Reid"
          autoComplete="name"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="editor-pass">Shared passcode</label>
        <input
          id="editor-pass"
          className="input"
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button className="btn btn-gold" type="submit" disabled={busy}>
        {busy ? 'Checking…' : 'Unlock editing'}
      </button>

      {mode === 'local' && (
        <div className="notice info" style={{ marginTop: '0.8rem' }}>
          Running without a backend, so changes save to this browser only. Once Supabase and Netlify
          are connected, edits are shared with everyone.
        </div>
      )}
    </form>
  )
}

// ---------------------------------------------------------------- fields

function Field({ field, value, onChange }) {
  // Owned by a custom panel above the form.
  if (field.type === 'internal') return null

  if (field.type === 'textarea') {
    return (
      <div className="field">
        <label htmlFor={`f-${field.key}`}>{field.label}</label>
        <textarea
          id={`f-${field.key}`}
          className="textarea"
          rows={field.rows || 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  if (field.type === 'list') {
    const items = Array.isArray(value) ? value : []
    return (
      <div className="field">
        <span className="field-label">{field.label}</span>
        {items.map((item, i) => (
          <div key={i} className="list-row">
            <textarea
              className="textarea"
              rows={2}
              value={item}
              onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
            />
            <button
              type="button"
              className="btn-remove"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn-add" onClick={() => onChange([...items, ''])}>
          + Add
        </button>
      </div>
    )
  }

  if (field.type === 'objectList') {
    const items = Array.isArray(value) ? value : []
    const blank = Object.fromEntries(field.fields.map((f) => [f.key, '']))
    return (
      <div className="field">
        <span className="field-label">{field.label}</span>
        {items.map((item, i) => (
          <div key={i} className="object-item">
            <div className="object-item-head">
              <span>
                {field.itemLabel || 'Item'} {i + 1}
              </span>
              <button
                type="button"
                className="btn-remove"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
            {field.fields.map((sub) => (
              <Field
                key={sub.key}
                field={sub}
                value={item?.[sub.key] ?? ''}
                onChange={(v) =>
                  onChange(items.map((row, j) => (j === i ? { ...row, [sub.key]: v } : row)))
                }
              />
            ))}
          </div>
        ))}
        <button type="button" className="btn-add" onClick={() => onChange([...items, { ...blank }])}>
          + Add {field.itemLabel ? field.itemLabel.toLowerCase() : 'item'}
        </button>
      </div>
    )
  }

  return (
    <div className="field">
      <label htmlFor={`f-${field.key}`}>{field.label}</label>
      <input
        id={`f-${field.key}`}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
