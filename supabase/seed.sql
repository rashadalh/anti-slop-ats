-- Seed jobs from fixtures/jobs.json (two jobs, no PII)

insert into public.jobs (id, slug, title, department, location, jd_text, sections)
values
  (
    'job_eng',
    'eng',
    'Senior Software Engineer',
    'Engineering',
    'Remote',
    'We build reliable distributed systems with Go and TypeScript. You will design APIs, improve observability, and mentor engineers. We value clarity, ownership, and pragmatic tradeoffs—not buzzword decks.',
    '[{"id":"contact","title":"Contact information","fields":[{"name":"first_name","type":"text","label":"First name","required":true,"options":[]},{"name":"last_name","type":"text","label":"Last name","required":true,"options":[]},{"name":"email","type":"email","label":"Email","required":true,"options":[]}]},{"id":"experience","title":"Experience","fields":[{"name":"current_title","type":"text","label":"Current job title","required":true,"options":[]},{"name":"current_company","type":"text","label":"Current company","required":true,"options":[]}]},{"id":"questions","title":"Application questions","fields":[{"name":"why_role","type":"textarea","label":"Why this role?","required":true,"options":[]},{"name":"proud_project","type":"textarea","label":"Project you are proud of","required":true,"options":[]},{"name":"debug_story","type":"textarea","label":"Tell us about a hard bug","required":true,"options":[]}]},{"id":"eeo","title":"EEO","fields":[{"name":"eeo_voluntary","type":"select","label":"Voluntary self-identification","required":false,"options":["Decline","Yes"]}]}]'::jsonb
  ),
  (
    'job_ops',
    'ops',
    'Operations Program Manager',
    'Operations',
    'New York, NY',
    'Own cross-functional programs, vendor relationships, and operational metrics. You will streamline processes and communicate with stakeholders across the company.',
    '[{"id":"contact","title":"Contact information","fields":[{"name":"first_name","type":"text","label":"First name","required":true,"options":[]},{"name":"last_name","type":"text","label":"Last name","required":true,"options":[]},{"name":"email","type":"email","label":"Email","required":true,"options":[]}]},{"id":"experience","title":"Experience","fields":[{"name":"current_title","type":"text","label":"Current job title","required":true,"options":[]},{"name":"years_ops","type":"text","label":"Years in operations","required":true,"options":[]}]},{"id":"questions","title":"Application questions","fields":[{"name":"why_ops","type":"textarea","label":"Why operations?","required":true,"options":[]},{"name":"program_example","type":"textarea","label":"Describe a program you led","required":true,"options":[]},{"name":"metrics","type":"textarea","label":"How do you measure success?","required":true,"options":[]}]},{"id":"eeo","title":"EEO","fields":[{"name":"eeo_voluntary","type":"select","label":"Voluntary self-identification","required":false,"options":["Decline","Yes"]}]}]'::jsonb
  )
on conflict (id) do nothing;
