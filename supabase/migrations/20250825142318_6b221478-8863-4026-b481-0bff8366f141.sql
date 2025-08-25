-- Create chat_conversations table to store all chat interactions
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  language TEXT,
  user_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy that only allows the owner to access data
-- This policy denies access to all users - only the owner can access via direct database queries
CREATE POLICY "Only owner can access chat conversations" 
ON public.chat_conversations 
FOR ALL 
USING (false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a service role function to insert chat conversations (bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_chat_conversation(
  p_user_message TEXT,
  p_assistant_message TEXT,
  p_language TEXT DEFAULT NULL,
  p_user_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  INSERT INTO public.chat_conversations (user_message, assistant_message, language, user_ip, user_agent)
  VALUES (p_user_message, p_assistant_message, p_language, p_user_ip, p_user_agent)
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;