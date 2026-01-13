-- Fix chat_conversations: Drop old policy and create proper admin-only policies
DROP POLICY IF EXISTS "Only owner can access chat conversations" ON public.chat_conversations;

-- Admin-only SELECT policy for chat_conversations
CREATE POLICY "Admins can view all chat conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only DELETE policy for chat_conversations
CREATE POLICY "Admins can delete chat conversations"
ON public.chat_conversations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT policy for authenticated users (needed for edge function)
CREATE POLICY "Authenticated users can insert chat conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix profiles: Add missing DELETE policy
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);