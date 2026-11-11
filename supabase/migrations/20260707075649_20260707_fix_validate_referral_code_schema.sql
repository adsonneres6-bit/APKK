/*
# Fix: validate_referral_code function with schema-qualified table reference

Before: referral_codes (could fail due to search_path)
After: public.referral_codes (always works)
*/

CREATE OR REPLACE FUNCTION public.validate_referral_code(input_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.referral_codes WHERE public.referral_codes.code = UPPER(TRIM(input_code))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;