-- Honeytrap demo: recruiter UI has no SSO yet (SPEC.md §9).
-- Anon may read detections and set overridden_label so a public /recruiter
-- page can watch auto-apply traffic. Do not treat this as production ATS auth.

grant select, update on public.detections to anon;

create policy detections_honeytrap_select on public.detections
  for select to anon using (true);

create policy detections_honeytrap_update on public.detections
  for update to anon using (true) with check (true);
