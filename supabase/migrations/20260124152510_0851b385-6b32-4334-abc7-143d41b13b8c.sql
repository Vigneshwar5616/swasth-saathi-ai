-- Fix user_settings table security
-- The current policies are not scoped to authenticated role and lack explicit anonymous denial

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

-- Create properly scoped policies for authenticated users only
CREATE POLICY "Authenticated users can view their own settings"
ON public.user_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own settings"
ON public.user_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own settings"
ON public.user_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own settings"
ON public.user_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create RESTRICTIVE policy to explicitly deny anonymous access
CREATE POLICY "Deny all anonymous access to user_settings"
ON public.user_settings
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);