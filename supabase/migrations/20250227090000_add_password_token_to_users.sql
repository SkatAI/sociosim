alter table public.users
add column if not exists password_setup_token text;

create index if not exists users_password_setup_token_idx
  on public.users (password_setup_token);
