-- Fix profiles table: Add anonymous deny policy that works properly
-- First drop existing deny policies that aren't working correctly
DROP POLICY IF EXISTS "Deny anonymous select on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous insert on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous update on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous delete on profiles" ON public.profiles;

-- Create PERMISSIVE policies that deny anonymous access
-- Using role check to ensure only authenticated users can access
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Drop old policies that don't specify role
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Fix user_conversations table: Add proper role-based policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.user_conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.user_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.user_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.user_conversations;

-- Create policies specifically for authenticated role only
CREATE POLICY "Authenticated users can view their own conversations"
ON public.user_conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own conversations"
ON public.user_conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own conversations"
ON public.user_conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own conversations"
ON public.user_conversations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);