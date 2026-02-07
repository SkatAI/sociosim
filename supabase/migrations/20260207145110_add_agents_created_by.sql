ALTER TABLE public.agents
ADD COLUMN created_by uuid;

ALTER TABLE public.agents
ADD CONSTRAINT agents_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.users(id)
ON DELETE RESTRICT;
