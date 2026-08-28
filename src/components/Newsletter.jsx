import React from 'react'
import { numberOr, paletteToStyle } from '../lib/palette'
import { hiddenSet } from '../data/schema'
import { linkifyReference } from '../lib/scriptures'
import {
  WEEKDAY_INITIALS,
  entriesByDay,
  formatDate,
  formatTime,
  monthGrid,
  monthIndexOf,
} from '../lib/calendar'

// ---------------------------------------------------------------- helpers

export const DEFAULT_BG_OPACITY = 0.12

const MONTH_ABBR_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The sheet's colour scheme. With no background image this returns nothing,
// so the Clay defaults in the stylesheet stand untouched.
function sheetProps(issue) {
  const design = issue.design || {}
  const image = design.backgroundImage || null
  const palette = image ? design.palette || null : null
  const opacity = numberOr(design.backgroundOpacity, DEFAULT_BG_OPACITY)

  return {
    className: `page paper${palette ? ' has-palette' : ''}`,
    style: image ? { ...paletteToStyle(palette, opacity), '--bg-opacity': String(opacity) } : undefined,
    image,
  }
}

const Background = ({ image }) =>
  image ? <div className="page-bg" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" /> : null

const Paragraphs = ({ text, className }) => {
  if (!text) return null
  return (
    <>
      {String(text)
        .split(/\n{2,}/)
        .map((chunk, i) => (
          <p key={i} className={className}>
            {chunk.split('\n').map((line, j, all) => (
              <React.Fragment key={j}>
                {line}
                {j < all.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        ))}
    </>
  )
}

// "Updated by Sister Reid · Sep 14" — shows who owns each section this month.
function Credit({ meta, id }) {
  const entry = meta?.[id]
  if (!entry?.by) return null
  const when = entry.at
    ? new Date(entry.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null
  return (
    <span className="credit">
      Updated by {entry.by}
      {when ? ` · ${when}` : ''}
    </span>
  )
}

const SectionHead = ({ title, meta, id }) => (
  <div className="section-head">
    <h2>{title}</h2>
    <Credit meta={meta} id={id} />
  </div>
)

const nonEmpty = (list) => (Array.isArray(list) ? list.filter(Boolean) : [])

// A month grid in the spirit of a bullet journal: dotted rules, soft washes,
// activities in green and birthdays in pink on the day they fall. Names show
// where there is room; on a phone the cells shrink to dots and the list
// underneath carries the detail.
function MonthCalendar({ monthKey, events, birthdays }) {
  const weeks = monthGrid(monthKey)
  const byDay = entriesByDay({ events, birthdays, monthKey })

  return (
    <div className="cal-grid">
      <div className="cal-head">
        {WEEKDAY_INITIALS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="cal-week">
          {week.map((day, di) => {
            const entries = day ? byDay.get(day) || [] : []
            return (
              <div
                key={di}
                className={`cal-day${day ? '' : ' is-empty'}${entries.length ? ' has-entries' : ''}`}
                // Also a native tooltip, so the day is readable where hover is
                // not available — touch screens, and screen readers.
                title={entries.length ? entries.map((e) => e.label).join(' · ') : undefined}
              >
                {day && <span className="cal-num">{day}</span>}
                {entries.map((e, i) => (
                  <span key={i} className={`cal-entry is-${e.kind}`}>
                    <span className="cal-dot" />
                    <span className="cal-label">{e.label}</span>
                  </span>
                ))}

                {/* Hovering a day says what is on it, since a cell this narrow
                    holds only dots. Screen only. */}
                {entries.length > 0 && (
                  <span className="cal-pop no-print" aria-hidden="true">
                    <span className="cal-pop-day">{MONTH_ABBR_SHORT[monthIndexOf(monthKey)]} {day}</span>
                    {entries.map((e, i) => (
                      <span key={i} className={`cal-pop-row is-${e.kind}`}>
                        <span className="cal-dot" />
                        {e.label}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div className="cal-legend">
        <span className="cal-key is-activity">
          <span className="cal-dot" /> Activities
        </span>
        <span className="cal-key is-birthday">
          <span className="cal-dot" /> Birthdays
        </span>
      </div>
    </div>
  )
}

// A scripture reference, linked to churchofjesuschrist.org where the wording
// is recognisable. On paper it just reads as text; on a phone it is tappable.
const Ref = ({ children }) => {
  const parts = linkifyReference(children)
  if (parts.length === 0) return children || null
  return (
    <>
      {parts.map((p, i) =>
        p.url ? (
          <a key={i} className="scripture-link" href={p.url} target="_blank" rel="noreferrer">
            {p.text}
          </a>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        ),
      )}
    </>
  )
}

// ---------------------------------------------------------------- page one

export function PageOne({ issue, meta }) {
  const m = issue.masthead
  const t = issue.theme
  const s = issue.scriptures
  const weeks = nonEmpty(issue.lessons?.weeks)
  const ld = issue.leader
  const questions = nonEmpty(t?.questions)
  const supporting = nonEmpty(s?.supporting)
  const sheet = sheetProps(issue)
  const hidden = hiddenSet(issue)

  return (
    <div className={sheet.className} style={sheet.style}>
      <Background image={sheet.image} />
      <header className="masthead">
        <div className="masthead-top">
          <span>{m?.unit}</span>
          <span>{m?.issue}</span>
        </div>
        <h1 className="masthead-title">{m?.audience || 'Young Women'}</h1>
        <div className="masthead-sub">
          <span>{m?.monthLabel}</span>
          <span className="dot">◆</span>
          <span>Newsletter</span>
        </div>
        {m?.tagline && <div className="masthead-tagline">{m.tagline}</div>}
        <div className="masthead-rule" />
      </header>

      {!hidden.has('theme') && (t?.title || t?.intro) && (
        <section className="theme">
          <div className="eyebrow">This Month’s Theme</div>
          <h1>{t.title}</h1>
          {t.source && <div className="theme-source">{t.source}</div>}
          <div className="theme-intro">
            <Paragraphs text={t.intro} />
          </div>
          {questions.length > 0 && (
            <div className="theme-questions">
              {questions.slice(0, 3).map((q, i) => (
                <div key={i} className="theme-question">
                  {q}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!hidden.has('scriptures') && (
      <section className="scriptures">
        <SectionHead title="Monthly Scriptures" meta={meta} id="scriptures" />

        {s?.featureText && (
          <div className="scripture-feature">
            <div className="ornament">✦</div>
            <blockquote>“{s.featureText}”</blockquote>
            <cite><Ref>{s.featureRef}</Ref></cite>
          </div>
        )}

        <div className="scripture-lower">
          <div className="scripture-list">
            {supporting.map((row, i) => (
              <div key={i} className="scripture-row">
                <span className="ref"><Ref>{row.ref}</Ref></span>
                <span className="note">{row.note}</span>
              </div>
            ))}
          </div>

          {s?.memorizeText && (
            <aside className="memorize">
              <div className="eyebrow">Memorize This Month</div>
              <blockquote>“{s.memorizeText}”</blockquote>
              <cite><Ref>{s.memorizeRef}</Ref></cite>
            </aside>
          )}
        </div>
      </section>
      )}

      {!hidden.has('lessons') && (
      <section className="lessons">
        <SectionHead title="Sundays This Month" meta={meta} id="lessons" />
        <div className="lesson-grid">
          {weeks.map((w, i) => (
            <article key={i} className="lesson">
              <div className="lesson-top">
                <span className="lesson-date">{w.date}</span>
                <span className="lesson-label">{w.label}</span>
              </div>
              <h3>{w.title}</h3>
              <div className="lesson-summary">{w.summary}</div>
              {(w.scriptures || w.taughtBy) && (
                <div className="lesson-foot">
                  <span className="refs"><Ref>{w.scriptures}</Ref></span>
                  {w.taughtBy && <span className="who">{w.taughtBy}</span>}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      )}

      {!hidden.has('leader') && (
      <section className="leader">
        <div className="leader-note">
          <SectionHead title="A Note For You" meta={meta} id="leader" />
          <Paragraphs text={ld?.body} />
          {ld?.from && <div className="leader-sign">— {ld.from}</div>}
        </div>

        {(ld?.serviceTitle || ld?.serviceBody) && (
          <aside className="service">
            <div className="eyebrow">Service Focus</div>
            <h3>{ld.serviceTitle}</h3>
            <p>{ld.serviceBody}</p>
          </aside>
        )}
      </section>
      )}

      <footer className="page-foot">
        <span>{m?.unit} · {m?.audience}</span>
        <span>{m?.monthLabel} · Page 1 of 2</span>
      </footer>
    </div>
  )
}

// ---------------------------------------------------------------- page two

export function PageTwo({ issue, meta, monthKey, leaderMode = false, viewOverride, onToggleCalendarView }) {
  const m = issue.masthead
  const h = issue.highlight
  const a = issue.activity
  const cal = issue.calendar
  const fun = issue.fun

  const facts = nonEmpty(h?.facts).filter((f) => f.label || f.value)
  const bring = nonEmpty(a?.bring)
  const events = nonEmpty(cal?.events).filter((e) => e.date || e.title)
  const birthdays = nonEmpty(cal?.birthdays).filter((b) => b.date || b.name)
  const monogram = (h?.name || '').trim().charAt(0).toUpperCase()
  const sheet = sheetProps(issue)
  const hidden = hiddenSet(issue)

  const calendarShown = !hidden.has('calendar')
  // The editor's choice is the default. A reader's own toggle overrides it for
  // that person only — including their printout, so what they see is what they
  // print — without changing the saved setting for anyone else.
  const calendarView = viewOverride || (cal?.view === 'calendar' ? 'calendar' : 'list')

  return (
    <div className={sheet.className} style={sheet.style}>
      <Background image={sheet.image} />
      <header className="runhead">
        <span>
          <strong>{m?.audience}</strong> · {m?.unit}
        </span>
        <span>{m?.monthLabel}</span>
      </header>

      {!hidden.has('highlight') && (
      <section className="highlight">
        <SectionHead title="Member Highlight" meta={meta} id="highlight" />
        <div className="highlight-body">
          {h?.photoUrl ? (
            <img className="portrait" src={h.photoUrl} alt={h.name || 'Member highlight'} />
          ) : (
            <div className="portrait-fallback" aria-hidden="true">
              {monogram || '✦'}
            </div>
          )}

          <div>
            <h3>{h?.name}</h3>
            {h?.role && <div className="highlight-role">{h.role}</div>}
            {h?.headline && <div className="highlight-headline">{h.headline}</div>}
            {h?.quote && <blockquote className="highlight-quote">“{h.quote}”</blockquote>}
            <div className="highlight-text">
              <Paragraphs text={h?.body} />
            </div>

            {facts.length > 0 && (
              <div className="facts">
                {facts.map((f, i) => (
                  <div key={i} className="fact">
                    <span className="fact-label">{f.label}</span>
                    {f.value ? (
                      <span className="fact-value">{f.value}</span>
                    ) : (
                      <span className="fact-blank" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {!hidden.has('activity') && (
      <section className="activity">
        <SectionHead title="Activity Spotlight" meta={meta} id="activity" />
        <div className="activity-panel">
          <div>
            <h3>{a?.title}</h3>
            <div className="activity-meta">
              {a?.when && <span>{a.when}</span>}
              {a?.where && <span>{a.where}</span>}
            </div>
            {a?.purpose && <div className="activity-purpose">{a.purpose}</div>}
            <div className="activity-blurb">
              <Paragraphs text={a?.blurb} />
            </div>
          </div>

          {bring.length > 0 && (
            <div className="bring">
              <div className="eyebrow">Bring With You</div>
              <ul>
                {bring.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {a?.note && <div className="activity-note">{a.note}</div>}
        </div>
      </section>
      )}


      {!(calendarShown === false && hidden.has('fun')) && (
      <section
        className={`columns${!calendarShown || hidden.has('fun') ? ' columns-single' : ''}`}
      >
        {calendarShown && (
        <div>
          <div className="section-head">
            <h2>Calendar</h2>
            {/* Readers switch the view for themselves. The button never
                prints; the view they chose does. */}
            <button
              type="button"
              className="view-swap no-print"
              onClick={onToggleCalendarView}
              title={calendarView === 'calendar' ? 'Show as a list' : 'Show as a calendar'}
            >
              {calendarView === 'calendar' ? 'List' : 'Calendar'}
            </button>
            <Credit meta={meta} id="calendar" />
          </div>

          {calendarView === 'calendar' ? (
            <>
              <MonthCalendar monthKey={monthKey} events={events} birthdays={birthdays} />
              {events.length > 0 && (
                <div className="cal-names">
                  {events.map((e, i) => (
                    <div key={i} className="cal-row">
                      <span className="cal-date">{formatDate(e.date)}</span>
                      <span>
                        <span className="cal-title">{e.title}</span>
                        {(e.time || e.detail) && (
                          <>
                            {' '}
                            <span className="cal-detail">
                              — {[e.time && formatTime(e.time), e.detail].filter(Boolean).join(' · ')}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="cal-list">
              {events.length > 0 ? (
                events.map((e, i) => (
                  <div key={i} className="cal-row">
                    <span className="cal-date">{formatDate(e.date)}</span>
                    <span>
                      <span className="cal-title">{e.title}</span>
                      {(e.time || e.detail) && (
                        <>
                          {' '}
                          <span className="cal-detail">
                            — {[e.time && formatTime(e.time), e.detail].filter(Boolean).join(' · ')}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                leaderMode && (
                  <p className="empty-hint no-print">Add this month’s dates in the editor.</p>
                )
              )}
            </div>
          )}

          <div className="birthdays">
            <div className="eyebrow">Happy Birthday</div>
            {birthdays.length > 0 ? (
              <div className="birthday-list">
                {birthdays.map((b, i) => (
                  <span key={i}>
                    <strong>{formatDate(b.date)}</strong> {b.name}
                  </span>
                ))}
              </div>
            ) : (
              leaderMode && (
                <p className="empty-hint no-print">Add birthdays in the editor.</p>
              )
            )}
          </div>
        </div>
        )}

        {!hidden.has('fun') && (
        <div>
          <SectionHead title="For You" meta={meta} id="fun" />

          {fun?.quote && (
            <div className="fun-block quote-card">
              <div className="eyebrow">Quote of the Month</div>
              <blockquote>“{fun.quote}”</blockquote>
              <cite>{fun.quoteBy}</cite>
            </div>
          )}

          {fun?.question && (
            <div className="fun-block">
              <div className="eyebrow">You Asked</div>
              <div className="qa-q">{fun.question}</div>
              <div className="qa-a">
                <Paragraphs text={fun.answer} />
              </div>
            </div>
          )}

          {fun?.challenge && (
            <div className="fun-block challenge">
              <div className="eyebrow">Challenge</div>
              <p>{fun.challenge}</p>
            </div>
          )}

          {fun?.progressPrompt && (
            <div className="fun-block">
              <div className="eyebrow">My Goal This Month</div>
              <div className="progress-prompt">{fun.progressPrompt}</div>
              <div className="progress-lines">
                <span />
                <span />
              </div>
            </div>
          )}
        </div>
        )}
      </section>
      )}

      <footer className="page-foot">
        <span>{m?.unit} · {m?.audience}</span>
        <span>{m?.monthLabel} · Page 2 of 2</span>
      </footer>
    </div>
  )
}
