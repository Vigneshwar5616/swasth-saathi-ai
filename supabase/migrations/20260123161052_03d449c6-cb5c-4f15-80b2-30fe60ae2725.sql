-- Add explicit deny policies for anonymous access to profiles table
-- This protects personal data (full names, emails, phones, DOB) from public access

-- Deny anonymous SELECT access
CREATE POLICY "Deny anonymous select on profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- Deny anonymous INSERT access
CREATE POLICY "Deny anonymous insert on profiles"
ON public.profiles
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);

-- Deny anonymous UPDATE access
CREATE POLICY "Deny anonymous update on profiles"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false);

-- Deny anonymous DELETE access
CREATE POLICY "Deny anonymous delete on profiles"
ON public.profiles
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);