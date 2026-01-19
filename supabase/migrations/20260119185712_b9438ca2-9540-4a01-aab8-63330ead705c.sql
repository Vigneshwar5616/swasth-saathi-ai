-- Remove user_ip and user_agent columns from chat_conversations table
-- These columns store sensitive user tracking data that creates privacy risks

-- First, drop the columns
ALTER TABLE public.chat_conversations DROP COLUMN IF EXISTS user_ip;
ALTER TABLE public.chat_conversations DROP COLUMN IF EXISTS user_agent;

-- Update the insert_chat_conversation function to remove these parameters
CREATE OR REPLACE FUNCTION public.insert_chat_conversation(
  p_user_message text, 
  p_assistant_message text, 
  p_language text DEFAULT NULL::text
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

  INSERT INTO public.chat_conversations (user_message, assistant_message, language)
  VALUES (p_user_message, p_assistant_message, p_language)
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$function$;

-- Add comment explaining the change
COMMENT ON TABLE public.chat_conversations IS 'Stores anonymous chat conversations for analytics. User IP and browser data have been removed for privacy compliance.';