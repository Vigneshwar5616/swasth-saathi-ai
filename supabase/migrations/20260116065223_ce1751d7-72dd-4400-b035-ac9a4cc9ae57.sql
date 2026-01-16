-- Fix profiles table security: restrict SELECT access to own profile or admin

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a proper PERMISSIVE SELECT policy (the previous one was RESTRICTIVE which doesn't work alone)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner as well (prevents bypassing RLS)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;