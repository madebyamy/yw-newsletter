import React from 'react'

// One mark per kind of entry, drawn rather than typed as emoji so it takes the
// page palette and prints the same everywhere.

const Flower = () => (
  <>
    <circle cx="12" cy="6.6" r="3.1" />
    <circle cx="17.4" cy="10.5" r="3.1" />
    <circle cx="15.3" cy="16.8" r="3.1" />
    <circle cx="8.7" cy="16.8" r="3.1" />
    <circle cx="6.6" cy="10.5" r="3.1" />
    <circle className="ei-center" cx="12" cy="12.4" r="2.4" />
  </>
)

const Plus = () => (
  <path d="M10.4 3.6h3.2v6.8h6.8v3.2h-6.8v6.8h-3.2v-6.8H3.6v-3.2h6.8Z" />
)

// A meetinghouse: low hall with a steeple.
const Chapel = () => (
  <>
    <path d="M3.4 20.6v-8.4l6.6-3.9 6.6 3.9v8.4Z" />
    <path className="ei-spire" d="M18.6 20.6V6.4l1.5-3 1.5 3v14.2Z" />
    <rect className="ei-door" x="8.4" y="14.6" width="3.2" height="6" rx="1.6" />
  </>
)

// A larger building for the stake centre: taller, with a tower and wings.
const StakeCentre = () => (
  <>
    <path d="M2.4 20.6v-7.2h4.4v7.2Z" />
    <path d="M17.2 20.6v-7.2h4.4v7.2Z" />
    <path className="ei-spire" d="M8.4 20.6V7.1L12 3.4l3.6 3.7v13.5Z" />
    <rect className="ei-door" x="10.6" y="14.2" width="2.8" height="6.4" rx="1.4" />
  </>
)

const Cake = () => (
  <>
    <path className="ei-flame" d="M12 2.4c.9 1 1.3 1.7 1.3 2.3a1.3 1.3 0 0 1-2.6 0c0-.6.4-1.3 1.3-2.3Z" />
    <rect className="ei-candle" x="11.4" y="5.2" width="1.2" height="3.1" rx="0.6" />
    <path d="M4.6 12.4c0-1.2 1-2.2 2.2-2.2h10.4c1.2 0 2.2 1 2.2 2.2v1.1c-.9 0-.9.9-1.8.9s-.9-.9-1.8-.9-.9.9-1.8.9-.9-.9-1.8-.9-.9.9-1.8.9-.9-.9-1.8-.9-.9.9-1.8.9-.9-.9-1.8-.9Z" />
    <path className="ei-base" d="M4.6 14.6h14.8v5.1c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6Z" />
  </>
)

const Star = () => (
  <path d="M12 3.6l2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16.6 6.8 19.5 8 13.7l-4.4-4 5.9-.7Z" />
)

const SHAPES = {
  yw: Flower,
  combined: Plus,
  ward: Chapel,
  stake: StakeCentre,
  birthday: Cake,
  other: Star,
}

export default function EntryIcon({ type = 'other', className = '' }) {
  const Shape = SHAPES[type] || Star
  return (
    <svg
      viewBox="0 0 24 24"
      className={`entry-icon is-${type} ${className}`.trim()}
      aria-hidden="true"
    >
      <Shape />
    </svg>
  )
}
