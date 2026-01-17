-- Fix profiles table: Recreate SELECT policy with proper role scoping
-- Drop existing policy and recreate as PERMISSIVE with explicit authenticated role
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Ensure other profile policies are also scoped to authenticated
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" 
  ON public.profiles 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = id);

-- Fix user_conversations table: Recreate policies with proper role scoping
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.user_conversations;
CREATE POLICY "Users can view their own conversations" 
  ON public.user_conversations 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.user_conversations;
CREATE POLICY "Users can insert their own conversations" 
  ON public.user_conversations 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.user_conversations;
CREATE POLICY "Users can delete their own conversations" 
  ON public.user_conversations 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);