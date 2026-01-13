-- Re-enable RLS on kv_store_fde062b7 and add proper policies
ALTER TABLE public.kv_store_fde062b7 ENABLE ROW LEVEL SECURITY;

-- Add a service role only policy for this internal table
CREATE POLICY "Service role can access kv_store"
ON public.kv_store_fde062b7
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);