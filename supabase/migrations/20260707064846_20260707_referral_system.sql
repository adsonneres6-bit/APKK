/*
# Referral System

## Overview
Implements a complete referral (indicação) system allowing users to share unique
6-character codes, invite new users, and receive bonus license days.

## New Tables

### referral_codes
Stores each user's unique referral code (6 chars, uppercase + digits).
- id (uuid, primary key)
- user_id (uuid, references profiles, unique)
- code (text, unique, 6 chars, uppercase alphanumeric)
- created_at (timestamptz)

### referrals
Records who referred whom and with which code.
- id (uuid, primary key)
- referred_user_id (uuid, references profiles, unique — one referral per user)
- referred_by_user_id (uuid, references profiles — the referrer)
- referral_code (text — the code that was used)
- status (text: 'pending' | 'bonified' — whether the bonus has been granted)
- created_at (timestamptz — date of referral)
- bonified_at (timestamptz, nullable — when the bonus was granted)

### referral_bonuses
Audit log of every bonus granted through the referral program.
- id (uuid, primary key)
- referrer_user_id (uuid, references profiles — who earned the bonus)
- referred_user_id (uuid, references profiles — whose action triggered it)
- referral_id (uuid, references referrals — the referral that generated this bonus)
- days_granted (integer — number of days added)
- reason (text — e.g. 'Indicação - cadastro imediato' or 'Indicação - primeira compra')
- trigger_type (text — 'immediate' or 'first_purchase')
- status (text — 'granted')
- created_at (timestamptz — date of bonus)

## Modified Tables

### app_settings
Added columns:
- referral_bonus_days (integer, default 7) — bonus days per referral
- referral_require_payment (boolean, default false) — if true, bonus only on first purchase

### profiles
Added column:
- referral_code (text, nullable) — denormalized copy for quick access

## Security
- RLS enabled on all new tables.
- Users can read their own referral data; admins can read all.

## Backfill
- Generates unique 6-char codes for all existing profiles who don't have one.
*/

-- ============================================================
-- 1. Add referral settings to app_settings
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'referral_bonus_days'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN referral_bonus_days INTEGER NOT NULL DEFAULT 7;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'referral_require_payment'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN referral_require_payment BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 2. Add denormalized referral_code to profiles
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_code TEXT;
  END IF;
END $$;

-- ============================================================
-- 3. Referral code generation function
-- ============================================================

CREATE OR REPLACE FUNCTION generate_referral_code()
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
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE referral_codes.code = gen_code) THEN
      RETURN gen_code;
    END IF;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique referral code after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Create referral_codes table
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(code)
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referral_code" ON referral_codes;
CREATE POLICY "select_own_referral_code" ON referral_codes FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- 5. Create referrals table
-- ============================================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_by_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bonified_at TIMESTAMPTZ,
  UNIQUE(referred_user_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referrals" ON referrals;
CREATE POLICY "select_own_referrals" ON referrals FOR SELECT
  TO authenticated USING (
    referred_user_id = auth.uid() OR referred_by_user_id = auth.uid() OR is_admin()
  );

-- ============================================================
-- 6. Create referral_bonuses table
-- ============================================================

CREATE TABLE IF NOT EXISTS referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  days_granted INTEGER NOT NULL,
  reason TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'immediate',
  status TEXT NOT NULL DEFAULT 'granted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referral_id)
);

ALTER TABLE referral_bonuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referral_bonuses" ON referral_bonuses;
CREATE POLICY "select_own_referral_bonuses" ON referral_bonuses FOR SELECT
  TO authenticated USING (
    referrer_user_id = auth.uid() OR referred_user_id = auth.uid() OR is_admin()
  );

-- ============================================================
-- 7. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by_user_id ON referrals(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referrer_user_id ON referral_bonuses(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_referred_user_id ON referral_bonuses(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_created_at ON referral_bonuses(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- ============================================================
-- 8. Trigger to auto-generate referral code on new profile
-- ============================================================

CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := generate_referral_code();
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, new_code);
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_create_referral_code ON profiles;
CREATE TRIGGER on_profile_create_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION create_referral_code_for_user();

-- ============================================================
-- 9. Backfill: generate codes for existing users
-- ============================================================

DO $$
DECLARE
  user_record RECORD;
  new_code TEXT;
BEGIN
  FOR user_record IN
    SELECT id FROM profiles WHERE referral_code IS NULL
  LOOP
    new_code := generate_referral_code();
    INSERT INTO referral_codes (user_id, code)
    VALUES (user_record.id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE profiles SET referral_code = new_code WHERE id = user_record.id;
  END LOOP;
END $$;

-- ============================================================
-- 10. Function to validate a referral code (publicly callable)
-- ============================================================

CREATE OR REPLACE FUNCTION validate_referral_code(input_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM referral_codes WHERE referral_codes.code = UPPER(TRIM(input_code))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
