-- ================================================================
-- ICAR DSRE Project Information Portal - Supabase database setup
-- ================================================================
-- BEFORE RUNNING:
-- Replace YOUR_ADMIN_EMAIL@EXAMPLE.COM below with the exact email
-- you will create under Supabase Authentication > Users.
-- ================================================================

create extension if not exists pgcrypto;

create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  scientist_name text not null check (char_length(scientist_name) between 2 and 120),
  designation text not null check (char_length(designation) between 2 and 120),
  employee_id text,
  email text,
  mobile text,
  division text not null default 'Division of System Research and Engineering',
  institute text not null default 'ICAR Research Complex for NEH Region, Umiam, Meghalaya',
  projects jsonb not null,
  submitted_at timestamptz not null default now(),
  constraint projects_must_be_nonempty_array check (
    jsonb_typeof(projects) = 'array' and jsonb_array_length(projects) > 0
  )
);

comment on table public.project_submissions is
  'Project information submitted by scientists through the DSRE GitHub Pages portal.';

create index if not exists project_submissions_submitted_at_idx
  on public.project_submissions (submitted_at desc);

alter table public.project_submissions enable row level security;

-- Reset policies safely when this script is run again.
drop policy if exists "Public can submit project information" on public.project_submissions;
drop policy if exists "Authorized administrator can read submissions" on public.project_submissions;

-- Anyone using the public form may insert a submission, but cannot read,
-- update or delete any submission.
create policy "Public can submit project information"
on public.project_submissions
for insert
to anon, authenticated
with check (true);

-- Only the authenticated administrator whose email exactly matches the
-- value below can read all submissions.
create policy "Authorized administrator can read submissions"
on public.project_submissions
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = lower('naseeb501@gmail.com')
);

-- Explicit privileges used by the browser client.
grant usage on schema public to anon, authenticated;
grant insert on table public.project_submissions to anon, authenticated;
grant select on table public.project_submissions to authenticated;

-- No browser user receives update or delete privileges.
revoke update, delete, truncate, references, trigger
  on table public.project_submissions
  from anon, authenticated;
