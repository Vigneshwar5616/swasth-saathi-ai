-- Fix user_roles table security
-- Add explicit RESTRICTIVE policy to deny anonymous access

-- Create RESTRICTIVE policy to explicitly deny anonymous access
CREATE POLICY "Deny all anonymous access to user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);