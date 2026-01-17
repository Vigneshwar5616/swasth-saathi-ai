-- Remove admin SELECT policy to protect anonymous user privacy
-- Service role can still access via direct database for analytics/debugging if needed
DROP POLICY IF EXISTS "Admins can view all chat conversations" ON public.chat_conversations;

-- Also remove admin DELETE policy as they shouldn't be able to delete anonymous conversations
DROP POLICY IF EXISTS "Admins can delete chat conversations" ON public.chat_conversations;