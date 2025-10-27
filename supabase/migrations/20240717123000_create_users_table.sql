-- Creates enum for user roles if it doesn't already exist
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role'
      and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('student', 'teacher', 'admin');
  end if;
end
$$;

-- Ensure helper function exists to maintain updated_at timestamps
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = timezone('CET', now());
  return new;
end;
$function$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'student',
  created_at timestamptz not null default timezone('CET', now()),
  updated_at timestamptz not null default timezone('CET', now())
);

create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.users enable row level security;
