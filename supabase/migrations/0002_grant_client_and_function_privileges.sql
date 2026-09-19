-- Grant table privileges alongside the RLS policies in 0001_init.sql.

-- Browser client operations allowed by the existing RLS policies.
grant select on public.jobs to anon, authenticated;
grant insert on public.application_sessions to anon;
grant insert on public.telemetry_events to anon;
grant usage on sequence public.telemetry_events_id_seq to anon;
grant insert on public.applications to anon;
grant select, update on public.detections to authenticated;

-- Edge Functions use the service role for trusted reads and writes.
grant select on public.jobs to service_role;
grant select, insert on public.application_sessions to service_role;
grant select, insert on public.telemetry_events to service_role;
grant usage on sequence public.telemetry_events_id_seq to service_role;
grant insert on public.applications to service_role;
grant select, insert on public.detections to service_role;
grant select, insert, update on public.known_fingerprints to service_role;
grant select, insert, update on public.known_ips to service_role;
