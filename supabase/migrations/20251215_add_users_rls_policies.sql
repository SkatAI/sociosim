-- Allow authenticated users to read their own user profile (including role)
CREATE POLICY "Users can read their own profile" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);
