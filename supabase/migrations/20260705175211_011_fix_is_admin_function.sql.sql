-- Fix is_admin function: add schema qualification
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
RETURN EXISTS (
SELECT 1 FROM public.profiles
WHERE id = auth.uid() AND is_admin = true
);
END;
$function$;