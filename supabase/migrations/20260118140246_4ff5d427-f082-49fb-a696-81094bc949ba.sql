-- Add database-level input validation to insert_chat_conversation function
-- This provides defense-in-depth alongside edge function validation
CREATE OR REPLACE FUNCTION public.insert_chat_conversation(
  p_user_message text, 
  p_assistant_message text, 
  p_language text DEFAULT NULL::text, 
  p_user_ip text DEFAULT NULL::text, 
  p_user_agent text DEFAULT NULL::text
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
  
  -- Validate IP address length if provided
  IF p_user_ip IS NOT NULL AND length(p_user_ip) > 45 THEN
    RAISE EXCEPTION 'IP address exceeds maximum length of 45 characters';
  END IF;
  
  -- Validate user agent length if provided (max 500 chars)
  IF p_user_agent IS NOT NULL AND length(p_user_agent) > 500 THEN
    -- Truncate user agent instead of rejecting (non-critical field)
    p_user_agent := LEFT(p_user_agent, 500);
  END IF;

  INSERT INTO public.chat_conversations (user_message, assistant_message, language, user_ip, user_agent)
  VALUES (p_user_message, p_assistant_message, p_language, p_user_ip, p_user_agent)
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$function$;