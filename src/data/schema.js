// Describes every editable section of the newsletter.
// The editor panel is generated from this, so adding a field here is all it
// takes to make it editable — there is no form code to touch.

export const SECTIONS = [
  {
    id: 'design',
    label: 'Background & Colors',
    page: 0,
    hint: 'Upload a pattern for this month. The page colours are matched to it automatically.',
    fields: [
      // Handled by a custom panel in the editor, not the generic form.
      { key: 'backgroundImage', label: 'Background image', type: 'internal' },
      { key: 'backgroundOpacity', label: 'Background strength', type: 'internal' },
      { key: 'palette', label: 'Palette', type: 'internal' },
    ],
  },
  {
    id: 'publish',
    label: 'Publish to the Young Women',
    page: 0,
    hint: 'Until this is switched on, only leaders can reach this month.',
    fields: [{ key: 'published', label: 'Published', type: 'internal' }],
  },
  {
    id: 'visibility',
    label: 'Show or Hide Blocks',
    page: 0,
    // Edited through the eye icons on the section list, not as its own screen.
    internalSection: true,
    hint: 'Turn blocks off for this month only — other months keep theirs.',
    fields: [{ key: 'hidden', label: 'Hidden blocks', type: 'internal' }],
  },
  {
    id: 'masthead',
    label: 'Header & Masthead',
    page: 1,
    hint: 'The banner across the top of page 1. Usually set once and left alone.',
    fields: [
      { key: 'unit', label: 'Ward or branch', type: 'text' },
      { key: 'audience', label: 'Group name', type: 'text' },
      { key: 'monthLabel', label: 'Month and year', type: 'text' },
      { key: 'issue', label: 'Issue line', type: 'text' },
      { key: 'tagline', label: 'Tagline', type: 'text' },
    ],
  },
  {
    id: 'theme',
    label: 'Monthly Theme',
    page: 1,
    hint: 'Comes from the For the Strength of Youth chapter for this month.',
    fields: [
      { key: 'title', label: 'Theme title', type: 'text' },
      { key: 'source', label: 'Source / page reference', type: 'text' },
      { key: 'intro', label: 'Intro paragraph', type: 'textarea', rows: 4 },
      { key: 'questions', label: 'Questions to think about', type: 'list' },
    ],
  },
  {
    id: 'scriptures',
    label: 'Monthly Scriptures',
    page: 1,
    hint: 'One featured passage, one short verse to memorize, plus supporting references.',
    fields: [
      { key: 'featureRef', label: 'Featured reference', type: 'text' },
      { key: 'featureText', label: 'Featured verse text', type: 'textarea', rows: 5 },
      { key: 'memorizeRef', label: 'Memorize — reference', type: 'text' },
      { key: 'memorizeText', label: 'Memorize — verse text', type: 'textarea', rows: 3 },
      {
        key: 'supporting',
        label: 'Supporting scriptures',
        type: 'objectList',
        itemLabel: 'Scripture',
        fields: [
          { key: 'ref', label: 'Reference', type: 'text' },
          { key: 'note', label: 'What it teaches', type: 'text' },
        ],
      },
    ],
  },
  {
    id: 'lessons',
    label: 'Weekly Lessons',
    page: 1,
    hint: 'One card per Sunday. This is the part the girls check most.',
    fields: [
      {
        key: 'weeks',
        label: 'Sundays this month',
        type: 'objectList',
        itemLabel: 'Sunday',
        fields: [
          { key: 'date', label: 'Date', type: 'text' },
          { key: 'label', label: 'Which Sunday', type: 'text' },
          { key: 'title', label: 'Lesson title', type: 'text' },
          { key: 'summary', label: 'What we will do', type: 'textarea', rows: 3 },
          { key: 'scriptures', label: 'Scriptures', type: 'text' },
          { key: 'taughtBy', label: 'Taught by', type: 'text' },
        ],
      },
    ],
  },
  {
    id: 'leader',
    label: 'Leader’s Note & Service',
    page: 1,
    hint: 'A short note from the presidency and the service focus for the month.',
    fields: [
      { key: 'from', label: 'Written by', type: 'text' },
      { key: 'body', label: 'Note', type: 'textarea', rows: 6 },
      { key: 'serviceTitle', label: 'Service focus title', type: 'text' },
      { key: 'serviceBody', label: 'Service focus details', type: 'textarea', rows: 3 },
    ],
  },
  {
    id: 'highlight',
    label: 'Member Highlight',
    page: 2,
    hint: 'Feature one young woman each month. Get her permission before publishing.',
    fields: [
      { key: 'name', label: 'Her name', type: 'text' },
      { key: 'role', label: 'Class / age', type: 'text' },
      { key: 'photoUrl', label: 'Photo URL (optional)', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'quote', label: 'Pull quote', type: 'textarea', rows: 3 },
      { key: 'body', label: 'Write-up', type: 'textarea', rows: 6 },
      {
        key: 'facts',
        label: 'Quick facts',
        type: 'objectList',
        itemLabel: 'Fact',
        fields: [
          { key: 'label', label: 'Question', type: 'text' },
          { key: 'value', label: 'Her answer', type: 'text' },
        ],
      },
    ],
  },
  {
    id: 'activity',
    label: 'Activity Spotlight',
    page: 2,
    hint: 'The main midweek activity for the month.',
    fields: [
      { key: 'title', label: 'Activity name', type: 'text' },
      { key: 'when', label: 'When', type: 'text' },
      { key: 'where', label: 'Where', type: 'text' },
      { key: 'purpose', label: 'Why we are doing it', type: 'text' },
      { key: 'blurb', label: 'Description', type: 'textarea', rows: 5 },
      { key: 'bring', label: 'What to bring', type: 'list' },
      { key: 'note', label: 'Safety / parent note', type: 'textarea', rows: 3 },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendar & Birthdays',
    page: 2,
    hint: 'Everything happening this month, plus birthdays to celebrate.',
    fields: [
      {
        key: 'events',
        label: 'This month',
        type: 'objectList',
        itemLabel: 'Event',
        fields: [
          { key: 'date', label: 'Date', type: 'text' },
          { key: 'title', label: 'Event', type: 'text' },
          { key: 'detail', label: 'Time / place', type: 'text' },
        ],
      },
      {
        key: 'birthdays',
        label: 'Birthdays',
        type: 'objectList',
        itemLabel: 'Birthday',
        fields: [
          { key: 'date', label: 'Date', type: 'text' },
          { key: 'name', label: 'Name', type: 'text' },
        ],
      },
    ],
  },
  {
    id: 'fun',
    label: 'Fun & Personal Development',
    page: 2,
    hint: 'The light corner — quote, a question from the girls, and a goal prompt.',
    fields: [
      { key: 'quote', label: 'Quote of the month', type: 'textarea', rows: 3 },
      { key: 'quoteBy', label: 'Said by', type: 'text' },
      { key: 'question', label: 'Question from a young woman', type: 'textarea', rows: 3 },
      { key: 'answer', label: 'Answer', type: 'textarea', rows: 4 },
      { key: 'challenge', label: 'Challenge of the month', type: 'text' },
      { key: 'progressPrompt', label: 'Personal development prompt', type: 'textarea', rows: 3 },
    ],
  },
]

export const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.id, s]))
export const SECTION_IDS = SECTIONS.map((s) => s.id)

// Blocks that can be switched off for a month. The masthead stays (it is the
// header), and the two settings sections are not printed at all.
export const HIDEABLE = [
  { id: 'theme', label: 'Monthly Theme', page: 1 },
  { id: 'scriptures', label: 'Monthly Scriptures', page: 1 },
  { id: 'lessons', label: 'Sundays This Month', page: 1 },
  { id: 'leader', label: 'A Note For You & Service Focus', page: 1 },
  { id: 'highlight', label: 'Member Highlight', page: 2 },
  { id: 'activity', label: 'Activity Spotlight', page: 2 },
  { id: 'calendar', label: 'Calendar & Birthdays', page: 2 },
  { id: 'fun', label: 'For You', page: 2 },
]

export function hiddenSet(issue) {
  const list = issue?.visibility?.hidden
  return new Set(Array.isArray(list) ? list : [])
}

// An empty value shaped correctly for a given field type.
export function emptyValue(field) {
  if (field.type === 'list') return []
  if (field.type === 'objectList') return []
  if (field.type === 'internal') return null
  return ''
}

// A blank issue with every section present but unfilled.
export function blankIssue() {
  const issue = {}
  for (const section of SECTIONS) {
    issue[section.id] = {}
    for (const field of section.fields) {
      issue[section.id][field.key] = emptyValue(field)
    }
  }
  return issue
}
