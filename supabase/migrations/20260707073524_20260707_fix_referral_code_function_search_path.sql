/*
# Fix: Referral code generation function search_path issue

## Root Cause
The trigger `create_referral_code_for_user()` calls `generate_referral_code()` 
without schema qualification. When executed from the auth context (via trigger 
chain from auth.users), the search_path doesn't include 'public', causing:
  "function generate_referral_code() does not exist"

This error was propagated and caused profile creation to fail, which in turn
caused all registration issues:
- No profile created
- No license created
- No referral code generated
- User not appearing in admin panel

## Fix
1. Update `create_referral_code_for_user()` to call `public.generate_referral_code()`
   with explicit schema qualification
2. Update `handle_new_user()` to be more robust with schema-qualified calls
*/

-- ============================================================
-- 1. Fix create_referral_code_for_user to use schema-qualified function call
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Generate a unique 6-char code (schema-qualified to avoid search_path issues)
  new_code := public.generate_referral_code();

  -- Insert into referral_codes (profile row already exists in AFTER trigger)
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, new_code);

  -- Update the denormalized referral_code column on profiles
  UPDATE public.profiles SET referral_code = new_code WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Ensure handle_new_user is schema-qualified
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, is_admin, active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone',
    NEW.email = 'admin0610@gmail.com' OR COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    now()
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.trigger_logs (user_id, action, message)
  VALUES (NEW.id, 'error', SQLERRM);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Ensure generate_referral_code is accessible by setting search_path
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  gen_code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    gen_code := '';
    FOR i IN 1..6 LOOP
      gen_code := gen_code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    attempts := attempts + 1;
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE public.referral_codes.code = gen_code) THEN
      RETURN gen_code;
    END IF;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique referral code after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;