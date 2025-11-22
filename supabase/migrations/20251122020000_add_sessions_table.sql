-- Create session_status enum
CREATE TYPE session_status AS ENUM ('active', 'ended', 'abandoned', 'error');

-- Create sessions table
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  adk_session_id text NOT NULL,
  status session_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Add session_id to messages table (nullable for backward compatibility)
ALTER TABLE messages ADD COLUMN session_id uuid REFERENCES sessions(id) ON DELETE SET NULL;

-- Remove adk_session_id from interviews table (now in sessions)
-- First make it nullable, then drop it
ALTER TABLE interviews ALTER COLUMN adk_session_id DROP NOT NULL;
ALTER TABLE interviews DROP COLUMN adk_session_id;

-- Create indexes for performance
CREATE INDEX idx_sessions_interview_id ON sessions(interview_id);
CREATE INDEX idx_sessions_adk_session_id ON sessions(adk_session_id);
CREATE INDEX idx_messages_session_id ON messages(session_id);

-- Add trigger for updated_at on sessions
CREATE TRIGGER set_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();
