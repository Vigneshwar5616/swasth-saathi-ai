-- Fix chat_conversations table security
-- The "Service role full access" policy is problematic as it uses USING(true) which is too permissive
-- Service role bypasses RLS anyway, so this policy is unnecessary and creates a security hole

-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role full access to chat_conversations" ON public.chat_conversations;

-- Drop existing policies and recreate with proper role restrictions
DROP POLICY IF EXISTS "Deny anonymous select on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Deny anonymous insert on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Deny anonymous update on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Deny anonymous delete on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can view their own chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can insert their own chat conversations" ON public.chat_conversations;

-- Create properly scoped policies for authenticated users only
CREATE POLICY "Authenticated users can view their own chat conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own chat conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can update their own chat conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can delete their own chat conversations"
ON public.chat_conversations
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create RESTRICTIVE policies to explicitly deny anonymous access
CREATE POLICY "Deny all anonymous access to chat_conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);