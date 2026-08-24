-- ============================================================
--  Young Women Newsletter — Supabase schema
--  Run this once in the Supabase SQL Editor.
-- ============================================================

create table if not exists public.newsletters (
  month_key   text primary key,          -- 'YYYY-MM', e.g. '2026-09'
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Keeps a trail of who changed which section, so nothing is ever
-- silently lost and you can see who wrote what.
create table if not exists public.newsletter_edits (
  id          bigserial primary key,
  month_key   text not null,
  section_id  text not null,
  editor      text,
  snapshot    jsonb,                     -- the section's value BEFORE this edit
  created_at  timestamptz not null default now()
);

create index if not exists newsletter_edits_month_idx
  on public.newsletter_edits (month_key, created_at desc);

-- ------------------------------------------------------------
--  Row Level Security
--  Writes never come from the browser — they go through the
--  Netlify function, which uses the service role key and
--  bypasses RLS. So we grant nothing to anon here.
-- ------------------------------------------------------------
alter table public.newsletters      enable row level security;
alter table public.newsletter_edits enable row level security;

-- (No anon policies on purpose. Reads are proxied by the function too,
--  which keeps the public link working without exposing any keys.)
