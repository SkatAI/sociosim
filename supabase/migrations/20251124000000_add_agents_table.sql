-- Add agents table and link interviews to agents
-- Each interview is with exactly one agent

-- Create agents table
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('CET', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('CET', now())
);

-- Insert agents from personas.yaml
INSERT INTO agents (agent_name, description) VALUES
  ('oriane', 'Simulated sociological interviewee (Oriane) for higher-ed AI usage research.'),
  ('theo', 'Simulated sociological interviewee (Théo) with tech-forward stance.'),
  ('jade', 'Simulated sociological interviewee (Jade) with critical/activist stance.');

-- Add agent_id column to interviews table
ALTER TABLE interviews
ADD COLUMN agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE RESTRICT DEFAULT gen_random_uuid();

-- Remove the default after all rows have been populated
ALTER TABLE interviews
ALTER COLUMN agent_id DROP DEFAULT;

-- Add trigger for agents updated_at column
CREATE TRIGGER set_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();
