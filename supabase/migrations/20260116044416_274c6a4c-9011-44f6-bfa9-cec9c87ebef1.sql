-- 1) Allow users to delete their own settings (GDPR compliance)
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
CREATE POLICY "Users can delete their own settings"
ON public.user_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2) Add a retention mechanism for admin chat logs (PII minimization via manual trigger)
CREATE OR REPLACE FUNCTION public.purge_old_chat_conversations(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.chat_conversations
  WHERE created_at < now() - make_interval(days => retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Only service role can call this function for security
REVOKE ALL ON FUNCTION public.purge_old_chat_conversations(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_chat_conversations(integer) TO service_role;