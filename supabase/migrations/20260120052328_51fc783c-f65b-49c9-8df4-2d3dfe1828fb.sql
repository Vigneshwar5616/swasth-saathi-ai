-- Fix profiles table: Add explicit denial policy for anonymous SELECT access
-- The existing "Users can view their own profile" policy uses TO authenticated,
-- but we need an explicit denial for anonymous users for defense in depth

CREATE POLICY "Deny anonymous select on profiles" 
ON public.profiles 
FOR SELECT 
TO anon
USING (false);

CREATE POLICY "Deny anonymous insert on profiles" 
ON public.profiles 
FOR INSERT 
TO anon
WITH CHECK (false);

CREATE POLICY "Deny anonymous update on profiles" 
ON public.profiles 
FOR UPDATE 
TO anon
USING (false);

CREATE POLICY "Deny anonymous delete on profiles" 
ON public.profiles 
FOR DELETE 
TO anon
USING (false);

-- Fix billing_info table: Add explicit denial policies for anonymous INSERT, UPDATE, DELETE
CREATE POLICY "Deny anonymous insert on billing_info" 
ON public.billing_info 
FOR INSERT 
TO anon
WITH CHECK (false);

CREATE POLICY "Deny anonymous update on billing_info" 
ON public.billing_info 
FOR UPDATE 
TO anon
USING (false);

CREATE POLICY "Deny anonymous delete on billing_info" 
ON public.billing_info 
FOR DELETE 
TO anon
USING (false);