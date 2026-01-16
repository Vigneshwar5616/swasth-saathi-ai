-- Update handle_new_user function to explicitly validate that only 'user' role is assigned
-- This prevents any potential injection of admin roles during user creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id);
  
  -- Explicitly insert only 'user' role - never allow admin role assignment during signup
  -- The role is hardcoded to 'user'::app_role to prevent any injection attacks
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user'::app_role);
  
  INSERT INTO public.billing_info (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$function$;

-- Add a comment documenting this security-critical function
COMMENT ON FUNCTION public.handle_new_user() IS 'Security-critical function: Creates user profile and assigns ONLY the user role. Admin roles must be assigned manually by existing admins through proper channels.';