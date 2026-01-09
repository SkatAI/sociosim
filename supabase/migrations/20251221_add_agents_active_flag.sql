begin;

alter table public.agents
  add column if not exists active boolean not null default true;

update public.agents
set active = false
where agent_name = 'template';

commit;
