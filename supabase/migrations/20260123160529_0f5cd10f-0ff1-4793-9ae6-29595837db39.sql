-- Add explicit deny policies for anonymous access to kv_store_fde062b7
-- This ensures the table is protected even if default RLS behavior changes

-- Deny anonymous SELECT access
CREATE POLICY "Deny anonymous select on kv_store"
ON public.kv_store_fde062b7
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Deny anonymous INSERT access
CREATE POLICY "Deny anonymous insert on kv_store"
ON public.kv_store_fde062b7
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);

-- Deny anonymous UPDATE access
CREATE POLICY "Deny anonymous update on kv_store"
ON public.kv_store_fde062b7
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false);

-- Deny anonymous DELETE access
CREATE POLICY "Deny anonymous delete on kv_store"
ON public.kv_store_fde062b7
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);