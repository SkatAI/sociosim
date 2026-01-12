ALTER TABLE public.agents
ADD COLUMN is_template boolean DEFAULT false NOT NULL;

UPDATE public.agents
SET is_template = true
WHERE agent_name = 'template';
