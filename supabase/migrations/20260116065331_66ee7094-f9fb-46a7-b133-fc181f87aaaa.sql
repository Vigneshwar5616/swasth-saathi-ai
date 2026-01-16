-- Fix user_roles table security: add restrictive INSERT, UPDATE, DELETE policies
-- Only admins should be able to manage user roles to prevent privilege escalation

-- Add INSERT policy - only admins can assign roles
CREATE POLICY "Only admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE policy - only admins can modify roles
CREATE POLICY "Only admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy - only admins can remove roles
CREATE POLICY "Only admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Force RLS for table owner as well
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;