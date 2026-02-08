UPDATE public.agents
SET created_by = (
  SELECT id
  FROM public.users
  WHERE email = 'alexis.perrier@gmail.com'
  LIMIT 1
)
WHERE created_by IS NULL;
