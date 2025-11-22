-- Ensure UUID generation function is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure updated_at trigger function exists (same as in users table)
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  new.updated_at = timezone('CET', now());
  RETURN new;
END;
$function$;

-- Enum for interview status
CREATE TYPE interview_status AS ENUM (
  'in_progress',
  'completed',
  'abandoned',
  'error'
);

-- Main interviews table
CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  adk_session_id text NOT NULL,
  status interview_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Messages table with token tracking
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Aggregated usage per interview
CREATE TABLE interview_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  total_input_tokens integer NOT NULL DEFAULT 0,
  total_output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Auto-update triggers for updated_at
CREATE TRIGGER set_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_interview_usage_updated_at
  BEFORE UPDATE ON interview_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();
