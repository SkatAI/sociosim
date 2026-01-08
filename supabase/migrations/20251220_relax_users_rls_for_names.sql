-- Allow authenticated users to read basic user profiles (used for prompt history labels)
CREATE POLICY "Users can read public profile names" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');
