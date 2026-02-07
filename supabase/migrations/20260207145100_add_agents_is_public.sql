ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
