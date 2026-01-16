-- Fix user_conversations policies to require authentication
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.user_conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.user_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.user_conversations;

CREATE POLICY "Users can view their own conversations"
ON public.user_conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
ON public.user_conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.user_conversations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);