-- Add a SELECT policy to deny public access to chat_conversations
-- This table stores anonymous chat data with IP addresses and should only be accessible via service role
CREATE POLICY "Deny public select on chat_conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (false);

-- Add UPDATE policy to deny public updates
CREATE POLICY "Deny public update on chat_conversations"
ON public.chat_conversations
FOR UPDATE
USING (false);

-- Add DELETE policy to deny public deletes
CREATE POLICY "Deny public delete on chat_conversations"
ON public.chat_conversations
FOR DELETE
USING (false);