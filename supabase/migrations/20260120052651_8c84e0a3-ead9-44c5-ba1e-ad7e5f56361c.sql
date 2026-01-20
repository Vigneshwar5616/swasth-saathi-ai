-- Add UPDATE policy for user_conversations table
-- This ensures users can only update their own conversations
CREATE POLICY "Users can update their own conversations"
ON public.user_conversations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);