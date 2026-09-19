-- Anti-Slop ATS schema (SPEC.md §3.17)

create table if not exists public.jobs (
  id text primary key,
  slug text not null unique,
  title text not null,
  department text not null,
  location text not null,
  jd_text text not null,
  sections jsonb not null
);

create table if not exists public.application_sessions (
  id text primary key,
  job_id text not null references public.jobs (id),
  visitor_id text not null default '',
  ip_hash text not null default '',
  started_at_ms bigint not null
);

create table if not exists public.telemetry_events (
  id bigserial primary key,
  session_id text not null references public.application_sessions (id),
  t_ms int not null,
  type text not null,
  field text,
  section text,
  input_len int,
  paste_len int,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id text primary key,
  session_id text not null references public.application_sessions (id),
  job_id text not null references public.jobs (id),
  created_at_ms bigint not null,
  answers jsonb not null,
  email_hash text not null default '',
  source text not null,
  duration_ms int not null default 0
);

create table if not exists public.detections (
  id text primary key,
  application_id text not null references public.applications (id),
  job_id text not null references public.jobs (id),
  created_at_ms bigint not null,
  label smallint not null,
  probability double precision not null,
  threshold double precision not null,
  confidence double precision not null,
  mode text not null,
  reasoning text not null,
  features jsonb not null,
  model_version text not null,
  source text not null,
  overridden_label smallint
);

create table if not exists public.known_fingerprints (
  visitor_id text primary key,
  n int not null default 0,
  window_start bigint not null
);

create table if not exists public.known_ips (
  ip_hash text primary key,
  n int not null default 0,
  window_start bigint not null
);

create table if not exists public.recruiters (
  user_id uuid primary key references auth.users (id)
);

create index if not exists detections_created_at_idx on public.detections (created_at_ms desc);
create index if not exists known_fingerprints_visitor_idx on public.known_fingerprints (visitor_id);
create index if not exists known_ips_hash_idx on public.known_ips (ip_hash);

alter table public.jobs enable row level security;
alter table public.application_sessions enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.applications enable row level security;
alter table public.detections enable row level security;
alter table public.known_fingerprints enable row level security;
alter table public.known_ips enable row level security;
alter table public.recruiters enable row level security;

create policy jobs_public_select on public.jobs
  for select using (true);

create policy sessions_anon_insert on public.application_sessions
  for insert to anon with check (true);

create policy telemetry_anon_insert on public.telemetry_events
  for insert to anon with check (true);

create policy applications_anon_insert on public.applications
  for insert to anon with check (true);

create policy detections_recruiter_select on public.detections
  for select to authenticated using (
    exists (select 1 from public.recruiters r where r.user_id = auth.uid())
  );

create policy detections_recruiter_update on public.detections
  for update to authenticated using (
    exists (select 1 from public.recruiters r where r.user_id = auth.uid())
  );

alter publication supabase_realtime add table public.detections;
