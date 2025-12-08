-- Seed demo users aligned with Supabase Auth
create extension if not exists pgcrypto;

-- Seed agents (idempotent)
insert into public.agents (agent_name, description)
values
  ('oriane', 'Simulated sociological interviewee (Oriane)'),
  ('theo', 'Simulated sociological interviewee (Théo)'),
  ('jade', 'Simulated sociological interviewee (Jade)')
on conflict (agent_name) do nothing;

do $$
declare
  seed_user record;
  auth_id uuid;
  meta jsonb;
begin
  for seed_user in
    select *
    from (values
      ('student', 'student@example.com', 'Student Demo', 'studentpass123'),
      ('teacher', 'teacher@example.com', 'Teacher Demo', 'teacherpass123'),
      ('admin', 'admin@example.com', 'Admin Demo', 'adminpass123')
    ) as t(role, email, full_name, raw_password)
  loop
    meta := jsonb_build_object('name', seed_user.full_name);

    select id
      into auth_id
      from auth.users
     where email = seed_user.email;

    if auth_id is null then
      auth_id := gen_random_uuid();

      insert into auth.users (
        id,
        email,
        raw_user_meta_data,
        raw_app_meta_data,
        role,
        aud,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at
      )
      values (
        auth_id,
        seed_user.email,
        meta,
        jsonb_build_object('provider', 'email', 'providers', to_jsonb(array['email'])),
        'authenticated',
        'authenticated',
        extensions.crypt(seed_user.raw_password, extensions.gen_salt('bf')),
        timezone('CET', now()),
        timezone('CET', now()),
        timezone('CET', now()),
        timezone('CET', now())
      );

      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        created_at,
        last_sign_in_at,
        updated_at
      )
      values (
        gen_random_uuid(),
        auth_id,
        jsonb_build_object('sub', auth_id::text, 'email', seed_user.email),
        'email',
        seed_user.email,
        timezone('CET', now()),
        timezone('CET', now()),
        timezone('CET', now())
      );
    else
      update auth.users
         set raw_user_meta_data = meta,
             updated_at = timezone('CET', now())
       where id = auth_id;
    end if;

    insert into public.users (id, name, email, role, password_setup_token)
    values (
      auth_id,
      seed_user.full_name,
      seed_user.email,
      seed_user.role::public.user_role,
      null
    )
    on conflict (id) do update
      set name = excluded.name,
          email = excluded.email,
          role = excluded.role,
          password_setup_token = excluded.password_setup_token;
  end loop;
end
$$;
