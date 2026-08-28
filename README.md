# Young Women Newsletter

A monthly newsletter for young women ages 12–18. One shared link that several
leaders can edit, and a two-page 8.5×11 sheet that prints or saves as a PDF
straight from the browser.

September 2026 is filled in from the Church's youth curriculum outline —
*You Are Blessed by Priesthood Keys and Authority* (For the Strength of Youth,
46–49).

**Setup instructions live in [SETUP.md](SETUP.md).**

---

## What it does

- **One link to share.** Anyone with the link reads the current issue. No
  account, no login.
- **Several editors.** Press *Edit sections*, enter the shared passcode, and
  edit any of nine sections. Each section saves on its own, so two people
  working at the same time never overwrite each other.
- **Who wrote what.** Every section shows the name of whoever last changed it,
  right on the printed page.
- **Prints properly.** *Print / Save PDF* produces exactly two 8.5×11 pages,
  designed to be run double-sided.
- **Month by month.** The arrows step to any month. Each month is its own
  issue; past months stay readable at their own link.

## The nine sections

| Page | Section | Who usually owns it |
|---|---|---|
| 1 | Header & Masthead | set once, then left alone |
| 1 | Monthly Theme | from the For the Strength of Youth chapter |
| 1 | Monthly Scriptures | featured verse, a verse to memorize, supporting refs |
| 1 | Weekly Lessons | one card per Sunday |
| 1 | Leader's Note & Service | the presidency |
| 2 | Member Highlight | one young woman each month |
| 2 | Activity Spotlight | the midweek activity |
| 2 | Calendar & Birthdays | dates and birthdays |
| 2 | Fun & Personal Development | quote, a question from the girls, a challenge |

The structure is identical every month, so the girls always know where to look.
Only the contents change.

## Starting a new month

Step the month arrow forward. The layout and section structure carry over; the
fields start empty apart from the month label. Fill them in from that month's
curriculum outline.

To pre-fill a month with real curriculum content the way September is, add a
file next to `src/data/september2026.js` and register it in the `SEEDS` map in
`src/data/issues.js`.

## Keeping it on two pages

Each sheet clips anything past 11 inches. If a section grows too long, an
orange warning appears under the page telling you how far over it runs — trim
before printing. The warning is on screen only; it never prints.

## Printing

Press **Print / Save PDF**, then in the browser's print dialog:

- Destination: your printer, or *Save as PDF*
- Paper: **Letter**
- Margins: **None**
- **Background graphics: on** — without this the coloured cards print blank

Two-sided, flip on long edge, gives you the finished handout.

## Two links: readers and leaders

| Link | Who | What they get |
|---|---|---|
| `…/?month=2026-09` | the young women | The newsletter. No Edit button. |
| `…/?month=2026-09&edit=1` | leaders | The same, plus **Edit sections**. |

**Copy share link** always produces the reader link, even while you are on the
leader one — so forwarding it can never hand out editing. **Copy leader link**
is the one to send other leaders.

If a leader does not have the link to hand, a small **Leaders** link at the
foot of the page adds the flag — so nobody is ever locked out.

Opening a leader link remembers it on that device, so leaders only need it
once. **Hide editing here**, in the editor footer, forgets it again — useful
if you hand your phone to one of the girls.

This is tidiness, not security. The passcode is what actually protects
editing, and it is checked on the server, never in the browser.

## Publishing a month

A month is a **draft** until you publish it, and drafts are invisible on the
reader link. Leaders always see everything, so next month can be built in the
open while the girls still read the current one.

**Publish to the Young Women** switches it on. The toolbar shows *Draft* or
*Published* while you work.

For readers, the month arrows step only between published issues. Opening a
draft month by URL sends them to the newest published one instead, and before
anything is published at all they see a short "No issues yet" note rather than
a blank page.

> Because a month is unpublished until you say otherwise, **September needs
> publishing once** — otherwise the girls will see "No issues yet".

## Turning blocks off for a month

**Show or Hide Blocks** ticks any of the eight blocks off for the month you are
editing. Hiding the Activity Spotlight in September leaves October's alone —
the list is stored with that month's issue.

Nothing is deleted. Whatever was written stays saved and reappears the moment
you tick the block back on. If both bottom-of-page-2 blocks are hidden the
remaining one widens to fill the space.

## Reading it on a phone

Below 820px the sheet stops pretending to be paper: it reflows to one column
at readable size instead of shrinking an 8.5in page onto a 6cm screen. Above
that width, and when printing, nothing changes — the fixed two-page layout is
exactly as it was.

## Backgrounds and colours

Each month can have its own background pattern. In **Background & Colors**,
choose an image and it is shrunk, stored with the issue, and laid behind both
pages. The palette is read from the image itself, so the cards retint to
match — no colour picking.

- **Pattern strength** controls how far the image shows through. Around 10%
  suits a busy pattern; the preview updates as you drag.
- **Remove background** puts the default colours straight back.
- With no image, the newsletter keeps its standard scheme. Nothing to undo.

Any colour scheme it produces keeps text readable: tinted cards are always
pale enough for near-black text, and the one strong band is forced dark enough
for white. Every combination clears the WCAG AA 4.5:1 minimum.

Images are downscaled to 1400px and re-encoded before storing, so a large
photo becomes a couple of hundred KB rather than several MB.

## Design

The look follows the Clay design system: cream canvas, Inter at weight 500 with
tight tracking for display type, saturated single-colour feature cards (peach,
teal, lavender, ochre, pink, mint) that never repeat back to back, and generous
corner radii.

Two things are worth knowing if it prints heavier than you want:

- `--canvas` in `src/styles/newsletter.css` controls the cream page flood. Set
  it to `#ffffff` for plain white paper.
- Any card fill can be swapped to `var(--surface-card)` for a much lighter
  cream card instead of a saturated one.

## How it is built

- **Vite + React**, no UI framework.
- **Netlify Function** (`netlify/functions/newsletter.js`) holds the passcode
  and the Supabase service key. Neither ever reaches the browser.
- **Supabase** stores each month as one JSON row, plus a history table holding
  the previous version of every section that gets edited.
- If the function is unreachable, the app quietly falls back to saving in that
  browser's local storage and says so in the toolbar. Nothing is lost; it just
  is not shared until the backend is connected.

## A note on the member highlight

Everyone featured is a minor. Get the young woman's permission and her parents'
before publishing her name, photo, or story on a public link.
