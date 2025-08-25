-- Fix security warnings by updating functions with proper search_path

-- Update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update the insert_chat_conversation function
CREATE OR REPLACE FUNCTION public.insert_chat_conversation(
  p_user_message TEXT,
  p_assistant_message TEXT,
  p_language TEXT DEFAULT NULL,
  p_user_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID 
SET search_path = public
LANGUAGE plpgsql 
SECURITY DEFINER AS $$
DECLARE
  conversation_id UUID;
BEGIN
  INSERT INTO public.chat_conversations (user_message, assistant_message, language, user_ip, user_agent)
  VALUES (p_user_message, p_assistant_message, p_language, p_user_ip, p_user_agent)
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$$;