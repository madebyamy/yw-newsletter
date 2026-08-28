// Turns a written scripture reference into a link on churchofjesuschrist.org.
//
// The Church's scripture URLs are predictable, so nothing is looked up or
// scraped: "Doctrine and Covenants 25:3, 7" becomes
//   /study/scriptures/dc-testament/dc/25?lang=eng&id=p3,p7#p3
// Anything that is not recognisably scripture — "For the Strength of Youth,
// 46-49" — is left as plain text rather than guessed at.

const BASE = 'https://www.churchofjesuschrist.org/study/scriptures'

// volume/book slugs, keyed by every spelling a leader might reasonably type.
const BOOKS = {
  // Old Testament
  genesis: 'ot/gen', gen: 'ot/gen',
  exodus: 'ot/ex', ex: 'ot/ex',
  leviticus: 'ot/lev', lev: 'ot/lev',
  numbers: 'ot/num', num: 'ot/num',
  deuteronomy: 'ot/deut', deut: 'ot/deut',
  joshua: 'ot/josh', josh: 'ot/josh',
  judges: 'ot/judg', judg: 'ot/judg',
  ruth: 'ot/ruth',
  '1 samuel': 'ot/1-sam', '1 sam': 'ot/1-sam',
  '2 samuel': 'ot/2-sam', '2 sam': 'ot/2-sam',
  '1 kings': 'ot/1-kgs', '1 kgs': 'ot/1-kgs',
  '2 kings': 'ot/2-kgs', '2 kgs': 'ot/2-kgs',
  '1 chronicles': 'ot/1-chr', '1 chr': 'ot/1-chr',
  '2 chronicles': 'ot/2-chr', '2 chr': 'ot/2-chr',
  ezra: 'ot/ezra', nehemiah: 'ot/neh', neh: 'ot/neh',
  esther: 'ot/esth', esth: 'ot/esth',
  job: 'ot/job',
  psalm: 'ot/ps', psalms: 'ot/ps', ps: 'ot/ps',
  proverbs: 'ot/prov', prov: 'ot/prov',
  ecclesiastes: 'ot/eccl', eccl: 'ot/eccl',
  isaiah: 'ot/isa', isa: 'ot/isa',
  jeremiah: 'ot/jer', jer: 'ot/jer',
  lamentations: 'ot/lam', lam: 'ot/lam',
  ezekiel: 'ot/ezek', ezek: 'ot/ezek',
  daniel: 'ot/dan', dan: 'ot/dan',
  hosea: 'ot/hosea', joel: 'ot/joel', amos: 'ot/amos', obadiah: 'ot/obad',
  jonah: 'ot/jonah', micah: 'ot/micah', nahum: 'ot/nahum',
  habakkuk: 'ot/hab', zephaniah: 'ot/zeph', haggai: 'ot/hag',
  zechariah: 'ot/zech', zech: 'ot/zech', malachi: 'ot/mal', mal: 'ot/mal',

  // New Testament
  matthew: 'nt/matt', matt: 'nt/matt',
  mark: 'nt/mark', luke: 'nt/luke', john: 'nt/john',
  acts: 'nt/acts',
  romans: 'nt/rom', rom: 'nt/rom',
  '1 corinthians': 'nt/1-cor', '1 cor': 'nt/1-cor',
  '2 corinthians': 'nt/2-cor', '2 cor': 'nt/2-cor',
  galatians: 'nt/gal', gal: 'nt/gal',
  ephesians: 'nt/eph', eph: 'nt/eph',
  philippians: 'nt/philip',
  colossians: 'nt/col', col: 'nt/col',
  '1 thessalonians': 'nt/1-thes', '2 thessalonians': 'nt/2-thes',
  '1 timothy': 'nt/1-tim', '2 timothy': 'nt/2-tim',
  titus: 'nt/titus', philemon: 'nt/philem',
  hebrews: 'nt/heb', heb: 'nt/heb',
  james: 'nt/james',
  '1 peter': 'nt/1-pet', '2 peter': 'nt/2-pet',
  '1 john': 'nt/1-jn', '2 john': 'nt/2-jn', '3 john': 'nt/3-jn',
  jude: 'nt/jude',
  revelation: 'nt/rev', rev: 'nt/rev',

  // Book of Mormon
  '1 nephi': 'bofm/1-ne', '1 ne': 'bofm/1-ne',
  '2 nephi': 'bofm/2-ne', '2 ne': 'bofm/2-ne',
  jacob: 'bofm/jacob', enos: 'bofm/enos', jarom: 'bofm/jarom', omni: 'bofm/omni',
  'words of mormon': 'bofm/w-of-m',
  mosiah: 'bofm/mosiah', alma: 'bofm/alma',
  helaman: 'bofm/hel', hel: 'bofm/hel',
  '3 nephi': 'bofm/3-ne', '3 ne': 'bofm/3-ne',
  '4 nephi': 'bofm/4-ne', '4 ne': 'bofm/4-ne',
  mormon: 'bofm/morm', morm: 'bofm/morm',
  ether: 'bofm/ether', moroni: 'bofm/moro', moro: 'bofm/moro',

  // Doctrine and Covenants
  'doctrine and covenants': 'dc-testament/dc',
  'd&c': 'dc-testament/dc',
  'dc': 'dc-testament/dc',
  'doctrine & covenants': 'dc-testament/dc',

  // Pearl of Great Price
  moses: 'pgp/moses', abraham: 'pgp/abr', abr: 'pgp/abr',
  'joseph smith-matthew': 'pgp/js-m',
  'joseph smith-history': 'pgp/js-h',
  'js-h': 'pgp/js-h',
  'articles of faith': 'pgp/a-of-f',
}

// Em dashes, curly apostrophes and double spaces all show up in pasted text.
function normalizeBook(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[’']/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Longest match wins, so "1 nephi" is not read as "1".
const BOOK_KEYS = Object.keys(BOOKS).sort((a, b) => b.length - a.length)

function findBook(text) {
  const norm = normalizeBook(text)
  for (const key of BOOK_KEYS) {
    if (norm === key || norm.endsWith(' ' + key) || norm.startsWith(key + ' ') || norm === key) {
      return { slug: BOOKS[key], key }
    }
  }
  return null
}

// "3, 7" -> id=p3,p7 ; "18-19" -> id=p18-p19
function verseParam(verses) {
  if (!verses) return null
  const parts = String(verses)
    .replace(/[—–]/g, '-')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  const ids = []
  for (const part of parts) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) ids.push(`p${range[1]}-p${range[2]}`)
    else if (/^\d+$/.test(part)) ids.push(`p${part}`)
  }
  if (ids.length === 0) return null
  const first = ids[0].split('-')[0]
  return { id: ids.join(','), anchor: first }
}

function buildUrl(slug, chapter, verses) {
  const v = verseParam(verses)
  let url = `${BASE}/${slug}/${chapter}?lang=eng`
  if (v) url += `&id=${v.id}#${v.anchor}`
  return url
}

// Splits a reference string into linkable and plain parts, so
// "D&C 27:12-13; 107:8" links both halves, the second inheriting the book.
export function linkifyReference(text) {
  if (!text) return []
  const segments = String(text).split(/(;)/)
  const parts = []
  let lastSlug = null

  for (const segment of segments) {
    if (segment === ';') {
      parts.push({ text: ';', url: null })
      continue
    }
    if (!segment.trim()) {
      if (segment) parts.push({ text: segment, url: null })
      continue
    }

    // <book?> <chapter>[:verses]
    const m = segment.match(/^(\s*)(.*?)\s*(\d+)\s*(?::\s*([\d,\s\-—–]+))?\s*$/)
    if (!m) {
      parts.push({ text: segment, url: null })
      continue
    }

    const [, lead, bookText, chapter, verses] = m
    let slug = lastSlug
    if (bookText && bookText.trim()) {
      const found = findBook(bookText)
      if (!found) {
        parts.push({ text: segment, url: null })
        continue
      }
      slug = found.slug
    }
    if (!slug) {
      parts.push({ text: segment, url: null })
      continue
    }

    lastSlug = slug
    if (lead) parts.push({ text: lead, url: null })
    parts.push({ text: segment.slice(lead.length), url: buildUrl(slug, chapter, verses) })
  }

  return parts
}

// True when any part of the string resolved to a scripture link.
export function hasLink(parts) {
  return parts.some((p) => p.url)
}
