-- Refactor database schema to support many-to-many relationships
-- Drop existing tables and enums (in reverse dependency order)

-- Drop messages table first (depends on sessions)
DROP TABLE IF EXISTS messages CASCADE;

-- Drop interview_usage table (depends on interviews)
DROP TABLE IF EXISTS interview_usage CASCADE;

-- Drop user_interview_session table (if exists)
DROP TABLE IF EXISTS user_interview_session CASCADE;

-- Drop sessions table
DROP TABLE IF EXISTS sessions CASCADE;

-- Drop interviews table
DROP TABLE IF EXISTS interviews CASCADE;

-- Drop enums
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS interview_status CASCADE;

-- Create new enums
CREATE TYPE session_status AS ENUM ('active', 'ended', 'abandoned', 'error');
CREATE TYPE interview_status AS ENUM ('in_progress', 'completed', 'abandoned', 'error');

-- Create interviews table (simplified - no user_id here)
CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status interview_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Create sessions table
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adk_session_id text NOT NULL UNIQUE,
  status session_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Create junction table for many-to-many relationships between users, interviews, and sessions
CREATE TABLE user_interview_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Create interview_usage table
CREATE TABLE interview_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  total_input_tokens integer NOT NULL DEFAULT 0,
  total_output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Add triggers for updated_at columns
CREATE TRIGGER set_interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_user_interview_session_updated_at
  BEFORE UPDATE ON user_interview_session
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_interview_usage_updated_at
  BEFORE UPDATE ON interview_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();
