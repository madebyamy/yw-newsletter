import React, { useLayoutEffect, useRef, useState } from 'react'
import { numberOr, paletteToStyle } from '../lib/palette'
import { hiddenSet } from '../data/schema'
import { readEntries, isBirthday, colorForName } from '../lib/entries'
import EntryIcon from './EntryIcon'
import { linkifyReference } from '../lib/scriptures'
import {
  WEEKDAY_INITIALS,
  entriesByDay,
  formatDate,
  formatTime,
  monthGrid,
  monthIndexOf,
  sortByDate,
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
function MonthCalendar({ monthKey, entries }) {
  const weeks = monthGrid(monthKey)
  const byDay = entriesByDay({ entries, monthKey })

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

// One dated row. The time sits under the date rather than trailing the title,
// so the left column reads as "when" and the right as "what".
const EventRow = ({ event }) => (
  <div className="cal-row">
    <span className="cal-date">
      {formatDate(event.date)}
      {event.time && !isBirthday(event) && (
        <span className="cal-time">{formatTime(event.time)}</span>
      )}
    </span>
    <span className="cal-what">
      <EntryIcon type={event.type || 'other'} />
      <span>
        <span
          className="cal-title"
          style={isBirthday(event) ? { color: colorForName(event.title) } : undefined}
        >
          {event.title}
        </span>
        {event.detail && !isBirthday(event) && (
          <>
            {' '}
            <span className="cal-detail">— {event.detail}</span>
          </>
        )}
      </span>
    </span>
  </div>
)

const CakeIcon = () => (
  <svg viewBox="0 0 24 24" className="bd-icon" aria-hidden="true">
    <path className="bd-flame" d="M12 2.4c.9 1 1.3 1.7 1.3 2.3a1.3 1.3 0 0 1-2.6 0c0-.6.4-1.3 1.3-2.3Z" />
    <rect className="bd-candle" x="11.4" y="5.2" width="1.2" height="3.1" rx="0.6" />
    <path className="bd-icing" d="M4.6 12.4c0-1.2 1-2.2 2.2-2.2h10.4c1.2 0 2.2 1 2.2 2.2v1.1c-.9 0-.9.9-1.8.9s-.9-.9-1.8-.9-.9.9-1.8.9-.9-.9-1.8-.9-.9.9-1.8.9-.9-.9-1.8-.9-.9.9-1.8.9-.9-.9-1.8-.9Z" />
    <path className="bd-base" d="M4.6 14.6h14.8v5.1c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6Z" />
  </svg>
)

const BalloonIcon = () => (
  <svg viewBox="0 0 24 24" className="bd-icon" aria-hidden="true">
    <ellipse className="bd-balloon-a" cx="9" cy="8" rx="4.6" ry="5.6" />
    <ellipse className="bd-balloon-b" cx="15.4" cy="10.2" rx="3.7" ry="4.5" />
    <path className="bd-string" d="M9 13.8c0 2.6 1.4 3.6 1.4 5.6M15.4 15c0 2-1 2.8-1 4.4" />
  </svg>
)

// Birthdays as a proper list in date order, with a cake on the heading and a
// balloon beside each name.
const Birthdays = ({ birthdays, leaderMode }) => (
  <div className="birthdays">
    <div className="bd-head">
      <CakeIcon />
      <span className="eyebrow">Happy Birthday</span>
      <BalloonIcon />
    </div>

    {birthdays.length > 0 ? (
      <ul className="birthday-list">
        {birthdays.map((b, i) => {
          const color = colorForName(b.title || b.name)
          return (
            <li key={i}>
              <span className="bd-bullet" style={{ background: color }} />
              <span className="bd-date">{formatDate(b.date)}</span>
              <span className="bd-name" style={{ color }}>
                {b.title || b.name}
              </span>
            </li>
          )
        })}
      </ul>
    ) : (
      leaderMode && <p className="empty-hint no-print">Add birthdays in the editor.</p>
    )}
  </div>
)

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

// ---------------------------------------------------------------- chrome

const Masthead = ({ m }) => (
  <header className="masthead" data-chrome="masthead">
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
)

const RunHead = ({ m }) => (
  <header className="runhead" data-chrome="runhead">
    <span>
      <strong>{m?.audience}</strong> · {m?.unit}
    </span>
    <span>{m?.monthLabel}</span>
  </header>
)

const PageFoot = ({ m, page, total }) => (
  <footer className="page-foot" data-chrome="foot">
    <span>
      {m?.unit} · {m?.audience}
    </span>
    <span>
      {m?.monthLabel} · Page {page} of {total}
    </span>
  </footer>
)

// ---------------------------------------------------------------- blocks

// Every printable section, in reading order. Sheets are packed from this list
// rather than being written out as fixed pages, so a section that no longer
// fits moves onto the next sheet instead of being cut off at the fold. Each
// node carries data-block so it can be measured where it really sits.
export function buildBlocks({ issue, meta, monthKey, leaderMode, viewOverride, onToggleCalendarView }) {
  const t = issue.theme
  const s = issue.scriptures
  const ld = issue.leader
  const cal = issue.calendar
  const fun = issue.fun

  const weeks = nonEmpty(issue.lessons?.weeks)
  const questions = nonEmpty(t?.questions)
  const supporting = nonEmpty(s?.supporting)
  const hidden = hiddenSet(issue)

  // One list for the month, read in date order regardless of the order it was
  // typed in. Birthdays live in it too, and are pulled out again for their own
  // block below — entering one puts it in both places.
  const entries = sortByDate(readEntries(cal), monthKey)
  // Under the month grid only the activities are named; birthdays have their
  // own block, so listing them twice would just cost space.
  const activityEntries = entries.filter((e) => !isBirthday(e))
  const birthdays = entries.filter(isBirthday)

  const calendarShown = !hidden.has('calendar')
  // The editor's choice is the default. A reader's own toggle overrides it for
  // that person only — including their printout, so what they see is what they
  // print — without changing the saved setting for anyone else.
  const calendarView = viewOverride || (cal?.view === 'calendar' ? 'calendar' : 'list')

  const out = []
  const add = (key, node) => {
    if (node) out.push({ key, node })
  }

  if (!hidden.has('theme') && (t?.title || t?.intro)) {
    add(
      'theme',
      <section className="theme" data-block="theme">
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
      </section>,
    )
  }

  // Second on the sheet, right under the theme. High enough that page one
  // keeps the dates even when a month runs long: whatever has to move onto
  // the next sheet, it will be something below this. The list and the
  // birthdays run side by side — a dated row is one line however wide the
  // column is, so a full width list would only waste the right-hand half.
  if (calendarShown) {
    add(
      'calendar',
      <section className="calendar-block" data-block="calendar">
        <div className="section-head">
          <h2>Calendar &amp; Birthdays</h2>
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

        <div className="calendar-body">
          <div>
            {calendarView === 'calendar' ? (
              <>
                <MonthCalendar monthKey={monthKey} entries={entries} />
                {activityEntries.length > 0 && (
                  <div className="cal-names">
                    {activityEntries.map((e, i) => (
                      <EventRow key={i} event={e} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="cal-list">
                {entries.length > 0 ? (
                  entries.map((e, i) => <EventRow key={i} event={e} />)
                ) : (
                  leaderMode && <p className="empty-hint no-print">Add this month’s dates in the editor.</p>
                )}
              </div>
            )}
          </div>

          <Birthdays birthdays={birthdays} leaderMode={leaderMode} />
        </div>
      </section>,
    )
  }

  // The verse to memorise sits beside the featured one rather than under it,
  // where it used to leave most of a card's worth of white. That puts the
  // supporting references on their own, full width, one line each — and being
  // a smaller piece, it is one the layout can move between sheets without
  // stranding half a page behind it.
  if (!hidden.has('scriptures')) {
    if (s?.featureText || s?.memorizeText) {
      add(
        'scriptures',
        <section className="scriptures" data-block="scriptures">
          <SectionHead title="Monthly Scriptures" meta={meta} id="scriptures" />
          <div className="scripture-top">
            {s?.featureText && (
              <div className="scripture-feature">
                <div className="ornament">✦</div>
                <blockquote>“{s.featureText}”</blockquote>
                <cite>
                  <Ref>{s.featureRef}</Ref>
                </cite>
              </div>
            )}

            {s?.memorizeText && (
              <aside className="memorize">
                <div className="eyebrow">Memorize This Month</div>
                <blockquote>“{s.memorizeText}”</blockquote>
                <cite>
                  <Ref>{s.memorizeRef}</Ref>
                </cite>
              </aside>
            )}
          </div>
        </section>,
      )
    }

    if (supporting.length > 0) {
      add(
        'scriptures-more',
        <section className="scriptures scriptures-more" data-block="scriptures-more">
          {/* Hidden by CSS when this lands directly under the first half; it's
              only needed when a page break has separated the two. */}
          <SectionHead title="Monthly Scriptures" meta={meta} id="scriptures" />
          <div className="scripture-list">
            {supporting.map((row, i) => (
              <div key={i} className="scripture-row">
                <span className="ref">
                  <Ref>{row.ref}</Ref>
                </span>
                <span className="note">{row.note}</span>
              </div>
            ))}
          </div>
        </section>,
      )
    }
  }

  if (!hidden.has('lessons')) {
    add(
      'lessons',
      <section className="lessons" data-block="lessons">
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
                  <span className="refs">
                    <Ref>{w.scriptures}</Ref>
                  </span>
                  {w.taughtBy && <span className="who">{w.taughtBy}</span>}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>,
    )
  }

  if (!hidden.has('leader')) {
    add(
      'leader',
      <section className="leader" data-block="leader">
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
      </section>,
    )
  }

  // The four cards used to stack in a narrow column, which made this the
  // tallest thing in the issue. Across the full width in two columns it is
  // about half the height for the same words.
  if (!hidden.has('fun')) {
    add(
      'fun',
      <section className="fun" data-block="fun">
        <SectionHead title="For You" meta={meta} id="fun" />
        <div className="fun-grid">
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
      </section>,
    )
  }


  return out
}

// ---------------------------------------------------------------- packing

const PAGE_H = 11 * 96
// A little air above the footer so the last line never sits on its rule.
const FOOT_GAP = 8
// How far a gap between sections may open up to take in a page's leftover
// height. Past this a page reads as stretched rather than composed.
const MAX_EXTRA_GAP = 48

const sameLayout = (a, b) =>
  a &&
  a.pages.length === b.pages.length &&
  a.pages.every((page, i) => page.length === b.pages[i].length && page.every((v, j) => v === b.pages[i][j])) &&
  a.gaps.every((g, i) => g === b.gaps[i])

// A page that stops well short of its footer looks unfinished. The height it
// has left over is shared out between the sections on it instead, so they sit
// down the page on purpose rather than piling up at the top. One share is
// held back for the foot of the page, and the whole thing is capped, so a
// nearly empty page does not end up with canyons in it.
function spreadSlack(pages, heights, firstCap, restCap) {
  return pages.map((indexes, pageNo) => {
    if (indexes.length < 2) return 0
    const used = indexes.reduce((sum, i) => sum + heights[i], 0)
    const slack = (pageNo === 0 ? firstCap : restCap) - used - 2
    if (slack <= 0) return 0
    return Math.floor(Math.min(MAX_EXTRA_GAP, slack / indexes.length))
  })
}

// Fewest sheets first: fill each one until the next block would cross 11in.
// This is optimal for the page count, because the sections have to stay in
// reading order.
function fewestPages(heights, firstCap, restCap) {
  let count = 1
  let used = 0
  let cap = firstCap
  for (const h of heights) {
    if (used > 0 && used + h > cap) {
      count += 1
      used = 0
      cap = restCap
    }
    used += h
  }
  return count
}

// Then spread the blocks across that many sheets as evenly as they will go,
// which is what stops the last page holding one lonely section while the one
// before it is packed to the fold. Same number of sheets either way — only
// the distribution changes.
function balance(heights, pageCount, firstCap, restCap) {
  const n = heights.length
  const capOf = (page) => (page === 0 ? firstCap : restCap)
  const sums = [0]
  for (let i = 0; i < n; i++) sums.push(sums[i] + heights[i])
  const span = (a, b) => sums[b] - sums[a]

  const INF = Infinity
  // best[k][i]: the smallest possible tallest page, packing blocks i..n-1
  // into k pages. cut[k][i] remembers where that page ended.
  const best = Array.from({ length: pageCount + 1 }, () => new Array(n + 1).fill(INF))
  const cut = Array.from({ length: pageCount + 1 }, () => new Array(n + 1).fill(-1))
  for (let k = 0; k <= pageCount; k++) best[k][n] = k === 0 ? 0 : INF
  best[0][n] = 0

  for (let k = 1; k <= pageCount; k++) {
    const page = pageCount - k // which sheet this is, counting from the front
    for (let i = n - 1; i >= 0; i--) {
      for (let j = i + 1; j <= n; j++) {
        const height = span(i, j)
        if (height > capOf(page) && j > i + 1) break // no room for more here
        const rest = best[k - 1][j]
        if (rest === INF) continue
        const worst = Math.max(height, rest)
        if (worst < best[k][i]) {
          best[k][i] = worst
          cut[k][i] = j
        }
      }
    }
  }

  if (best[pageCount][0] === INF) return null
  const pages = []
  let i = 0
  for (let k = pageCount; k > 0; k--) {
    const j = cut[k][i]
    if (j < 0) return null
    pages.push(Array.from({ length: j - i }, (_, t) => i + t))
    i = j
  }
  return pages
}

// Packs the blocks onto as many sheets as they need. Everything is measured
// once in an offscreen copy laid out at the real 8.5in width, then filled in
// order: a block that would cross 11in starts the next sheet instead.
function usePagination({ rigRef, isPhone, deps }) {
  const [layout, setLayout] = useState(null)

  useLayoutEffect(() => {
    if (isPhone) {
      setLayout(null)
      return
    }
    const rig = rigRef.current
    if (!rig) return

    const measure = () => {
      const flow = rig.querySelector('[data-rig="flow"]')
      if (!flow) return
      const cs = getComputedStyle(flow)
      const padTop = parseFloat(cs.paddingTop) || 0
      const padBottom = parseFloat(cs.paddingBottom) || 0
      const contentTop = flow.getBoundingClientRect().top + padTop

      const head = flow.querySelector('[data-chrome="masthead"]')
      const foot = flow.querySelector('[data-chrome="foot"]')
      const run = rig.querySelector('[data-chrome="runhead"]')

      // The masthead is measured to its bottom edge rather than by height, so
      // its own rule and spacing are counted with it.
      const headH = head ? head.getBoundingClientRect().bottom - contentTop : 0
      const runH = run ? run.getBoundingClientRect().height : 0
      const footH = (foot ? foot.getBoundingClientRect().height : 0) + FOOT_GAP

      // Bottom-to-bottom, so the gap between two blocks is charged to the one
      // below it whichever of the two owns the margin.
      let prev = contentTop + headH
      const heights = [...flow.querySelectorAll('[data-block]')].map((el) => {
        const bottom = el.getBoundingClientRect().bottom
        const h = bottom - prev
        prev = bottom
        return h
      })
      // Print hides the measuring copy, and a hidden element measures zero.
      // Believing that would collapse the whole issue onto one page at exactly
      // the moment it is being sent to the printer, so keep the last good
      // layout instead.
      if (heights.length === 0 || heights.every((h) => h <= 0)) return

      const firstCap = PAGE_H - padTop - padBottom - headH - footH
      const restCap = PAGE_H - padTop - padBottom - runH - footH

      // Fewest sheets first, then spread the sections evenly across them.
      const count = fewestPages(heights, firstCap, restCap)
      const pages = balance(heights, count, firstCap, restCap)
      if (!pages) return
      const next = { pages, gaps: spreadSlack(pages, heights, firstCap, restCap) }

      setLayout((prevLayout) => (sameLayout(prevLayout, next) ? prevLayout : next))
    }

    measure()
    // Photos arrive after the first paint, and web fonts settle a moment later.
    const ro = new ResizeObserver(measure)
    ro.observe(rig)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return layout
}

// ---------------------------------------------------------------- sheets

export function Sheets({
  issue,
  meta,
  monthKey,
  leaderMode = false,
  viewOverride,
  onToggleCalendarView,
  isPhone = false,
  frameStyle,
  pageStyle,
}) {
  const m = issue.masthead
  const sheet = sheetProps(issue)
  const blocks = buildBlocks({ issue, meta, monthKey, leaderMode, viewOverride, onToggleCalendarView })

  const rigRef = useRef(null)
  const wrapRef = useRef(null)

  const layout = usePagination({
    rigRef,
    isPhone,
    deps: [issue, monthKey, leaderMode, viewOverride, isPhone, blocks.length],
  })

  // Before the first measurement, and on a phone where the sheet reflows into
  // one continuous column, everything sits on a single page.
  const pages = layout && layout.pages.length > 0 ? layout.pages : [blocks.map((_, i) => i)]
  const gaps = layout ? layout.gaps : []
  const total = pages.length

  // A single block can still be taller than a sheet on its own. Moving it does
  // not help, so say so while there is still time to trim.
  const [over, setOver] = useState([])
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const next = isPhone
      ? []
      : [...el.querySelectorAll('.sheet .page')].map((p) => Math.max(0, p.scrollHeight - p.clientHeight))
    setOver((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next))
  })

  const place = (i) => React.cloneElement(blocks[i].node, { key: blocks[i].key })

  return (
    <>
      {!isPhone && (
        <div className="print-rig" aria-hidden="true" ref={rigRef}>
          <div className={sheet.className} style={sheet.style} data-rig="flow">
            <Masthead m={m} />
            {blocks.map((b) => React.cloneElement(b.node, { key: b.key }))}
            <PageFoot m={m} page={1} total={1} />
          </div>
          <div className={sheet.className} style={sheet.style} data-rig="run">
            <RunHead m={m} />
          </div>
        </div>
      )}

      <div className="sheets" ref={wrapRef}>
        {pages.map((indexes, pi) => (
          <div key={pi} className="sheet">
            <div className="page-frame" style={frameStyle}>
              <div className="page-scale" style={pageStyle}>
                <div
                  className={sheet.className}
                  style={{ ...sheet.style, "--gap-extra": String(gaps[pi] || 0) + "px" }}
                >
                  <Background image={sheet.image} />
                  {pi === 0 ? <Masthead m={m} /> : <RunHead m={m} />}
                  {indexes.map(place)}
                  <PageFoot m={m} page={pi + 1} total={total} />
                </div>
              </div>
            </div>
            {over[pi] > 0 && (
              <p className="overflow-warn no-print">
                Page {pi + 1} runs past the sheet by about {Math.round((over[pi] / 96) * 25.4)}mm. This
                section is too long to fit on a page of its own — trim some text, or the bottom will be cut
                off when it prints.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
