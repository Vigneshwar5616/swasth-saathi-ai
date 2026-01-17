-- Fix: Remove admin override from profiles SELECT policy to prevent excessive data access
-- Admins should use service role for legitimate admin operations, not bypass user privacy via RLS

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);