alter table public.users
  add column if not exists is_banned boolean not null default false;
