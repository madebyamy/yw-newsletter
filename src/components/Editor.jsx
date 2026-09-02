import React, { useEffect, useMemo, useState } from 'react'
import { HIDEABLE, SECTIONS, SECTION_MAP, emptyValue } from '../data/schema'
import { numberOr, prepareBackground, prepareImage } from '../lib/palette'
import { needsMigration, legacyToEntries } from '../lib/entries'
import EntryIcon from './EntryIcon'

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
  onLeaveLeaderMode,
  onLogOut,
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
    const copy = JSON.parse(JSON.stringify(issue[id] ?? {}))

    // A month saved before the single list gets converted on open. The old
    // keys are left in place rather than deleted, so nothing is thrown away.
    if (id === 'calendar' && needsMigration(copy)) {
      copy.entries = legacyToEntries(copy)
      copy.entriesMigrated = true
    }
    setDraft(copy)
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

  // Which blocks are switched off for this month.
  const hiddenIds = useMemo(() => {
    const list = issue?.visibility?.hidden
    return new Set(Array.isArray(list) ? list : [])
  }, [issue])

  const [togglingId, setTogglingId] = useState(null)

  // The eye saves straight away — a toggle that needed a separate Save step
  // would be more confusing than useful.
  async function toggleHidden(id) {
    setTogglingId(id)
    setMessage(null)
    const next = new Set(hiddenIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)

    const result = await onSaveSection('visibility', { hidden: [...next] })
    setTogglingId(null)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error || 'Could not change that.' })
    }
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
              {SECTIONS.filter((s) => !s.internalSection).map((s) => {
                const entry = meta?.[s.id]
                const canHide = HIDEABLE.some((h) => h.id === s.id)
                const isHidden = hiddenIds.has(s.id)
                return (
                  <div
                    key={s.id}
                    className={`section-row${isHidden ? ' is-hidden' : ''}${
                      s.page === 0 ? ' is-setup' : ''
                    }`}
                  >
                    <button className="section-btn" onClick={() => openSection(s.id)}>
                      {/* Page 0 is not a page — these two set up the issue
                          rather than printing on it, so they read "Setup". */}
                      <span className="page-chip">{s.page === 0 ? 'Setup' : `P${s.page}`}</span>
                      <span>
                        <span className="section-name">{s.label}</span>
                        <span className="section-meta">
                          {isHidden
                            ? `Hidden in ${monthLabel} — still saved`
                            : entry?.by
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

                    {canHide && (
                      <button
                        className="eye-btn"
                        onClick={() => toggleHidden(s.id)}
                        disabled={togglingId === s.id}
                        aria-pressed={!isHidden}
                        title={
                          isHidden
                            ? `Show ${s.label} in ${monthLabel}`
                            : `Hide ${s.label} in ${monthLabel}`
                        }
                      >
                        <EyeIcon open={!isHidden} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {unlocked && section && draft && (
            <div>
              {section.id === 'publish' && (
                <PublishToggle draft={draft} onChange={setField} monthLabel={monthLabel} />
              )}
              {section.id === 'design' && (
                <BackgroundDesigner draft={draft} onChange={setField} />
              )}
              {section.id === 'highlight' && (
                <PhotoUpload
                  value={draft.photoUrl}
                  onChange={(v) => setField('photoUrl', v)}
                />
              )}
              {section.id === 'scriptures' && (
                <p className="import-hint schedule-note">
                  References link themselves to churchofjesuschrist.org, so the girls can tap a
                  scripture and read it. Write them normally — “D&amp;C 13:1” or “Doctrine and
                  Covenants 107:18–19”.
                </p>
              )}
              {section.id === 'calendar' && (
                <CalendarViewToggle draft={draft} onChange={setField} />
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
                  {onLogOut && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="link-btn"
                        onClick={onLogOut}
                        title="Forgets the passcode on this device"
                      >
                        Log out
                      </button>
                    </>
                  )}
                  {onLeaveLeaderMode && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="link-btn"
                        onClick={onLeaveLeaderMode}
                        title="Hides the Edit button on this device until you open a leader link again"
                      >
                        Hide editing here
                      </button>
                    </>
                  )}
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

// ---------------------------------------------------------------- calendar

// Whether this month prints as a list of dates or as a month grid.
function CalendarViewToggle({ draft, onChange }) {
  const view = draft.view === 'calendar' ? 'calendar' : 'list'
  return (
    <div className="import-panel">
      <span className="field-label">Show as</span>
      <div className="view-toggle">
        {[
          ['list', 'List of dates'],
          ['calendar', 'Month calendar'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`view-option${view === value ? ' is-on' : ''}`}
            onClick={() => onChange('view', value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="import-hint">
        The calendar shows activities in green and birthdays in pink on the day they fall. On a
        phone the days shrink to dots and the list appears underneath.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- photo

// Her photo is chosen from the device rather than pasted as a link. It is
// shrunk to print size before being stored with the issue — a phone photo is
// several megabytes, and the printed frame is under two inches wide.
function PhotoUpload({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setNote(null)
    try {
      const result = await prepareImage(file, { maxEdge: 900, quality: 0.82 })
      onChange(result.dataUrl)
      setNote({ kind: 'ok', text: `Photo added (${result.approxKb} KB). Press Save section to keep it.` })
    } catch (err) {
      setNote({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const isLink = typeof value === 'string' && /^https?:/i.test(value)

  return (
    <div className="import-panel">
      <span className="field-label">Her photo</span>

      {note && <div className={`notice ${note.kind}`}>{note.text}</div>}

      {value ? (
        <>
          <img className="photo-preview" src={value} alt="" />
          {isLink && (
            <p className="import-hint">
              This one is a web link from before. Choosing a photo below stores it with the
              newsletter instead, so it cannot vanish if that link stops working.
            </p>
          )}
          <button type="button" className="btn" onClick={() => onChange('')}>
            Remove photo
          </button>
        </>
      ) : (
        <p className="import-hint">
          Optional. Without one, her initial is shown instead. Please have her and her parents’
          permission before adding a photo to a public link.
        </p>
      )}

      <label className={`btn btn-file${busy ? ' is-busy' : ''}`}>
        {busy ? 'Preparing…' : value ? 'Choose a different photo' : 'Choose a photo'}
        <input type="file" accept="image/*" onChange={handleFile} hidden disabled={busy} />
      </label>
    </div>
  )
}

// ---------------------------------------------------------------- icons

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {open ? (
      <>
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.6" />
      </>
    ) : (
      <>
        <path d="M4 4l16 16" />
        <path d="M9.6 5.8A10.9 10.9 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.5 4.2" />
        <path d="M6.4 7.6A17.4 17.4 0 0 0 2 12s3.6 6.5 10 6.5a11 11 0 0 0 3.1-.45" />
      </>
    )}
  </svg>
)

// ---------------------------------------------------------------- publish

// Until a month is published, the reader link cannot reach it at all. Leaders
// always can, so a half-written issue can be worked on in the open.
function PublishToggle({ draft, onChange, monthLabel }) {
  const published = draft.published === true

  return (
    <div className="import-panel">
      <span className="field-label">{monthLabel}</span>

      <div className={`publish-state ${published ? 'is-live' : 'is-draft'}`}>
        <strong>{published ? 'Published' : 'Draft'}</strong>
        <span>
          {published
            ? 'The young women can open this month from the shared link.'
            : 'Only leaders can see this month. It is not on the shared link.'}
        </span>
      </div>

      <ul className="toggle-list">
        <li>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={published}
              onChange={() => onChange('published', !published)}
            />
            <span className="toggle-name">Show {monthLabel} to the young women</span>
          </label>
        </li>
      </ul>

      <p className="import-hint">
        Publish once the month is ready. Unpublishing later hides it again — nothing is deleted, and
        leaders keep full access either way.
      </p>
    </div>
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

function Field({ field, value, onChange, idPrefix = 'f' }) {
  const fieldId = `${idPrefix}-${field.key}`
  // Owned by a custom panel above the form.
  if (field.type === 'internal') return null

  if (field.type === 'textarea') {
    return (
      <div className="field">
        <label htmlFor={fieldId}>{field.label}</label>
        <textarea
          id={fieldId}
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
    const blank = Object.fromEntries(
      field.fields.map((f) => [f.key, f.type === 'select' ? f.options[0].value : '']),
    )
    return (
      <div className="field">
        <span className="field-label">{field.label}</span>
        {items.map((item, i) => (
          <div key={i} className="object-item">
            <div className="object-item-head">
              <span className="object-item-name">
                {item?.type && <EntryIcon type={item.type} className="ei-inline" />}
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
            {field.fields
              // A birthday has no time or place — just a date and a name.
              .filter((sub) => !(sub.hideWhenType && item?.type === sub.hideWhenType))
              .map((sub) => (
                <Field
                  key={sub.key}
                  field={sub}
                  idPrefix={`${idPrefix}-${field.key}-${i}`}
                  value={item?.[sub.key] ?? ''}
                  onChange={(v) =>
                    onChange(items.map((row, j) => (j === i ? { ...row, [sub.key]: v } : row)))
                  }
                />
              ))}
          </div>
        ))}
        <button type="button" className="btn-add" onClick={() => onChange([...items, { ...blank }])}>
          + {field.addLabel || `Add ${field.itemLabel ? field.itemLabel.toLowerCase() : 'item'}`}
        </button>
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="field">
        <label htmlFor={`f-${field.key}`}>{field.label}</label>
        <select
          id={`f-${field.key}`}
          className="input"
          value={value || field.options[0].value}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'date' || field.type === 'time') {
    return (
      <div className="field">
        <label htmlFor={fieldId}>{field.label}</label>
        <input
          id={fieldId}
          className="input"
          type={field.type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {field.hint && <p className="field-hint">{field.hint}</p>}
      </div>
    )
  }

  return (
    <div className="field">
      <label htmlFor={fieldId}>{field.label}</label>
      <input
        id={fieldId}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
