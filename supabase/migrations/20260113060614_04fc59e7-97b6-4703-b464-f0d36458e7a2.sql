-- Drop existing policies on billing_info table
DROP POLICY IF EXISTS "Users can view their own billing" ON public.billing_info;
DROP POLICY IF EXISTS "Users can insert their own billing" ON public.billing_info;
DROP POLICY IF EXISTS "Users can update their own billing" ON public.billing_info;

-- Recreate policies with explicit TO authenticated clause to block anonymous access
CREATE POLICY "Users can view their own billing"
ON public.billing_info
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing"
ON public.billing_info
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing"
ON public.billing_info
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);