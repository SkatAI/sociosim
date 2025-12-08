-- Consolidated initial schema dump captured from the current database.
-- Generated with: pg_dump --schema=public --schema-only --no-owner --no-privileges
-- Server version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- CREATE SCHEMA public;

-- COMMENT ON SCHEMA public IS 'standard public schema';

CREATE TYPE public.interview_status AS ENUM (
    'in_progress',
    'completed',
    'abandoned',
    'error'
);

CREATE TYPE public.session_status AS ENUM (
    'active',
    'ended',
    'abandoned',
    'error'
);

CREATE TYPE public.user_role AS ENUM (
    'student',
    'teacher',
    'admin'
);

-- Required for gen_random_uuid() and gen_salt()/crypt in seeds
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  new.updated_at = timezone('CET', now());
  RETURN new;
END;
$$;

SET default_tablespace = '';
SET default_table_access_method = heap;

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_name text NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL
);

CREATE TABLE public.interview_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interview_id uuid NOT NULL,
    total_input_tokens integer DEFAULT 0 NOT NULL,
    total_output_tokens integer DEFAULT 0 NOT NULL,
    estimated_cost_usd numeric(10,6),
    updated_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL
);

CREATE TABLE public.interviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status public.interview_status DEFAULT 'in_progress'::public.interview_status NOT NULL,
    started_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    agent_id uuid NOT NULL
);

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    created_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    adk_session_id text NOT NULL,
    status public.session_status DEFAULT 'active'::public.session_status NOT NULL,
    started_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL
);

CREATE TABLE public.user_interview_session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    interview_id uuid NOT NULL,
    session_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL
);

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role public.user_role DEFAULT 'student'::public.user_role NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('CET'::text, now()) NOT NULL,
    password_setup_token text
);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_agent_name_key UNIQUE (agent_name);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interview_usage
    ADD CONSTRAINT interview_usage_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_adk_session_id_key UNIQUE (adk_session_id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_interview_session
    ADD CONSTRAINT user_interview_session_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

CREATE INDEX users_password_setup_token_idx ON public.users USING btree (password_setup_token);

CREATE TRIGGER set_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_interview_usage_updated_at BEFORE UPDATE ON public.interview_usage FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_user_interview_session_updated_at BEFORE UPDATE ON public.user_interview_session FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE ONLY public.interview_usage
    ADD CONSTRAINT interview_usage_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_interview_session
    ADD CONSTRAINT user_interview_session_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_interview_session
    ADD CONSTRAINT user_interview_session_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_interview_session
    ADD CONSTRAINT user_interview_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
