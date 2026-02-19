-- Explicitly deny anonymous access to user_conversations
CREATE POLICY "Deny all anonymous access to user_conversations"
ON public.user_conversations
AS RESTRICTIVE FOR ALL
TO anon
USING (false)
WITH CHECK (false);