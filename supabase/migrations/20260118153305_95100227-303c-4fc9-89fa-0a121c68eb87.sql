-- Fix profiles table: Drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Fix billing_info table: Drop restrictive policies and create permissive ones
DROP POLICY IF EXISTS "Users can view their own billing" ON public.billing_info;
DROP POLICY IF EXISTS "Users can insert their own billing" ON public.billing_info;
DROP POLICY IF EXISTS "Users can update their own billing" ON public.billing_info;

CREATE POLICY "Users can view their own billing"
ON public.billing_info FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing"
ON public.billing_info FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing"
ON public.billing_info FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);