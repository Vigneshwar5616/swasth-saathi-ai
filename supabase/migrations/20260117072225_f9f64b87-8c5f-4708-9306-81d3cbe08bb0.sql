-- Fix profiles SELECT policy - change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Fix user_roles SELECT policy - change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" 
  ON public.user_roles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);