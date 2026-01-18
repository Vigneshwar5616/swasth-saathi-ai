-- Force RLS to apply even to table owners
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Add explicit deny policy for anonymous users to prevent any public access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR SELECT
TO anon
USING (false);

-- Also apply same protection to billing_info table
ALTER TABLE public.billing_info FORCE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to billing_info"
ON public.billing_info FOR SELECT
TO anon
USING (false);