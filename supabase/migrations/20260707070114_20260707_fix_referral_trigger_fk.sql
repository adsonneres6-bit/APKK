/*
# Fix: Referral code trigger FK violation

## Root Cause
The `create_referral_code_for_user()` trigger was defined as BEFORE INSERT on `profiles`.
It inserted into `referral_codes` (which has a FK to `profiles(id)`), but the profile row
didn't exist yet at BEFORE INSERT time, causing a foreign key violation:
  "insert or update on table referral_codes violates foreign key constraint referral_codes_user_id_fkey"

This error propagated up through `handle_new_user()` → auth.users trigger → Supabase Auth,
causing all new user registrations to fail with "Database error saving new user".

## Fix
1. Change the trigger from BEFORE INSERT to AFTER INSERT on profiles.
   At AFTER INSERT time, the profile row already exists, so the FK insert into
   referral_codes succeeds.
2. Update the function to UPDATE the profiles.referral_code column after inserting
   the referral_codes record (since we can no longer use NEW.referral_code in AFTER mode).
3. Recreate the trigger as AFTER INSERT.
4. Also recreate the trigger_logs table that handle_new_user()'s exception handler
   references, so errors are properly logged instead of causing a secondary failure.

## No functionality removed
- The referral code is still auto-generated for every new user.
- The referral_codes table and all its constraints remain intact.
- The generate_referral_code() function is unchanged.
*/

-- ============================================================
-- 1. Recreate trigger_logs table (referenced by handle_new_user exception handler)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trigger_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

GRANT INSERT ON public.trigger_logs TO supabase_auth_admin;
GRANT INSERT ON public.trigger_logs TO authenticator;

-- ============================================================
-- 2. Recreate the trigger function as AFTER INSERT compatible
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Generate a unique 6-char code
  new_code := generate_referral_code();

  -- Insert into referral_codes (profile row already exists in AFTER trigger)
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, new_code);

  -- Update the denormalized referral_code column on profiles
  UPDATE profiles SET referral_code = new_code WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Drop the old BEFORE INSERT trigger and create AFTER INSERT trigger
-- ============================================================

DROP TRIGGER IF EXISTS on_profile_create_referral_code ON profiles;

CREATE TRIGGER on_profile_create_referral_code
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION create_referral_code_for_user();
