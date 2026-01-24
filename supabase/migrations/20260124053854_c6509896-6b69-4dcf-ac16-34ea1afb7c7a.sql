-- Add optional user_id column to chat_conversations for user isolation
ALTER TABLE public.chat_conversations 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster user-based queries
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations(user_id);

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Service role can insert chat conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Deny public select on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Deny public update on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Deny public delete on chat_conversations" ON public.chat_conversations;

-- Create new RLS policies

-- Deny all anonymous access
CREATE POLICY "Deny anonymous select on chat_conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

CREATE POLICY "Deny anonymous insert on chat_conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Deny anonymous update on chat_conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Deny anonymous delete on chat_conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);

-- Allow authenticated users to see their own conversations
CREATE POLICY "Users can view their own chat conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow authenticated users to insert their own conversations
CREATE POLICY "Users can insert their own chat conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service role can still insert (for anonymous/edge function logging)
CREATE POLICY "Service role full access to chat_conversations"
ON public.chat_conversations
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update the insert_chat_conversation function to accept optional user_id
CREATE OR REPLACE FUNCTION public.insert_chat_conversation(
  p_user_message text, 
  p_assistant_message text, 
  p_language text DEFAULT NULL::text,
  p_user_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conversation_id UUID;
BEGIN
  -- Validate user message length (max 10000 characters)
  IF length(p_user_message) > 10000 THEN
    RAISE EXCEPTION 'User message exceeds maximum length of 10000 characters';
  END IF;
  
  -- Validate user message is not empty
  IF length(TRIM(p_user_message)) < 1 THEN
    RAISE EXCEPTION 'User message cannot be empty';
  END IF;
  
  -- Validate assistant message length (max 50000 characters for AI responses)
  IF length(p_assistant_message) > 50000 THEN
    RAISE EXCEPTION 'Assistant message exceeds maximum length of 50000 characters';
  END IF;
  
  -- Validate assistant message is not empty
  IF length(TRIM(p_assistant_message)) < 1 THEN
    RAISE EXCEPTION 'Assistant message cannot be empty';
  END IF;
  
  -- Validate language code length if provided
  IF p_language IS NOT NULL AND length(p_language) > 10 THEN
    RAISE EXCEPTION 'Language code exceeds maximum length of 10 characters';
  END IF;

  INSERT INTO public.chat_conversations (user_message, assistant_message, language, user_id)
  VALUES (p_user_message, p_assistant_message, p_language, p_user_id)
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$function$;