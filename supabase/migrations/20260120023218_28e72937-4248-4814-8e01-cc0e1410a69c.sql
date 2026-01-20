-- Fix profiles table: Drop the conflicting restrictive policies and create proper PERMISSIVE policies
-- The issue is that RESTRICTIVE policies combine with AND, blocking all access

-- Drop existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Create a single PERMISSIVE SELECT policy that properly restricts to owner only
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Fix user_conversations table: Ensure proper PERMISSIVE policy
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.user_conversations;

-- Create PERMISSIVE SELECT policy for user_conversations
CREATE POLICY "Users can view their own conversations" 
ON public.user_conversations 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);