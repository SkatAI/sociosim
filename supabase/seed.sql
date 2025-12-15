-- Seed agents (idempotent)
insert into public.agents (agent_name, description)
values
  ('oriane', 'Simulated sociological interviewee (Oriane)'),
  ('theo', 'Simulated sociological interviewee (Théo)'),
  ('jade', 'Simulated sociological interviewee (Jade)')
on conflict (agent_name) do nothing;
