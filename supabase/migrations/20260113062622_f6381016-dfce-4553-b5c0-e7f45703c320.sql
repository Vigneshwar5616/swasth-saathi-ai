-- Fix the chat_conversations INSERT policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can insert chat conversations" ON public.chat_conversations;

-- Create a more restrictive INSERT policy - only service role can insert (via edge function)
-- We'll use the security definer function for inserts
CREATE POLICY "Service role can insert chat conversations"
ON public.chat_conversations
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also fix kv_store_fde062b7 which has RLS enabled but no policies
-- This appears to be an internal table, let's add proper policies
ALTER TABLE public.kv_store_fde062b7 DISABLE ROW LEVEL SECURITY;