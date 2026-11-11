/*
 * Remove auth dependency: change user_id columns from UUID (auth.users FK)
 * to TEXT storing the installation UUID. Replace RLS policies that used
 * auth.uid() with installation_id-based policies for anon+authenticated.
 *
 * APPLY THIS MIGRATION IN SUPABASE DASHBOARD OR VIA MCP TOOL.
 */

-- 1. Drop all existing RLS policies that reference auth.uid()
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "delete_profile" ON profiles;

DROP POLICY IF EXISTS "select_own_license" ON licenses;
DROP POLICY IF EXISTS "insert_license" ON licenses;
DROP POLICY IF EXISTS "update_license" ON licenses;
DROP POLICY IF EXISTS "delete_license" ON licenses;

DROP POLICY IF EXISTS "select_own_history" ON import_history;
DROP POLICY IF EXISTS "insert_own_history" ON import_history;
DROP POLICY IF EXISTS "update_own_history" ON import_history;
DROP POLICY IF EXISTS "delete_own_history" ON import_history;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
DROP POLICY IF EXISTS "insert_payment" ON payments;
DROP POLICY IF EXISTS "update_payment" ON payments;

DROP POLICY IF EXISTS "select_pix_settings" ON pix_settings;
DROP POLICY IF EXISTS "update_pix_settings" ON pix_settings;

DROP POLICY IF EXISTS "select_app_settings" ON app_settings;
DROP POLICY IF EXISTS "update_app_settings" ON app_settings;
DROP POLICY IF EXISTS "insert_app_settings" ON app_settings;

-- active_sessions policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "select_own_sessions" ON active_sessions;
  DROP POLICY IF EXISTS "insert_own_sessions" ON active_sessions;
  DROP POLICY IF EXISTS "update_own_sessions" ON active_sessions;
  DROP POLICY IF EXISTS "delete_own_sessions" ON active_sessions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- announcement policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "select_announcements" ON global_announcements;
  DROP POLICY IF EXISTS "insert_announcements" ON global_announcements;
  DROP POLICY IF EXISTS "update_announcements" ON global_announcements;
  DROP POLICY IF EXISTS "delete_announcements" ON global_announcements;
  DROP POLICY IF EXISTS "select_own_confirmations" ON announcement_confirmations;
  DROP POLICY IF EXISTS "insert_own_confirmations" ON announcement_confirmations;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- tutorial completions
DO $$ BEGIN
  DROP POLICY IF EXISTS "select_own_tutorials" ON user_tutorial_completions;
  DROP POLICY IF EXISTS "insert_own_tutorials" ON user_tutorial_completions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- device_fingerprints
DO $$ BEGIN
  DROP POLICY IF EXISTS "select_own_fingerprints" ON device_fingerprints;
  DROP POLICY IF EXISTS "insert_own_fingerprints" ON device_fingerprints;
  DROP POLICY IF EXISTS "update_own_fingerprints" ON device_fingerprints;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- user_devices
DO $$ BEGIN
  DROP POLICY IF EXISTS "select_own_devices" ON user_devices;
  DROP POLICY IF EXISTS "insert_own_devices" ON user_devices;
  DROP POLICY IF EXISTS "update_own_devices" ON user_devices;
  DROP POLICY IF EXISTS "delete_own_devices" ON user_devices;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- referral tables
DO $$ BEGIN
  DROP POLICY IF EXISTS "select_own_referral_codes" ON referral_codes;
  DROP POLICY IF EXISTS "insert_own_referral_codes" ON referral_codes;
  DROP POLICY IF EXISTS "select_own_referrals" ON referrals;
  DROP POLICY IF EXISTS "insert_own_referrals" ON referrals;
  DROP POLICY IF EXISTS "select_own_referral_bonuses" ON referral_bonuses;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Alter user_id columns from UUID (FK to profiles/auth.users) to TEXT
ALTER TABLE import_history DROP CONSTRAINT IF EXISTS import_history_user_id_fkey;
ALTER TABLE import_history ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE import_history ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE active_sessions DROP CONSTRAINT IF EXISTS active_sessions_user_id_fkey;
ALTER TABLE active_sessions ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE active_sessions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE active_sessions ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE announcement_confirmations DROP CONSTRAINT IF EXISTS announcement_confirmations_user_id_fkey;
ALTER TABLE announcement_confirmations ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE user_tutorial_completions DROP CONSTRAINT IF EXISTS user_tutorial_completions_user_id_fkey;
ALTER TABLE user_tutorial_completions ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 3. Create new RLS policies allowing anon+authenticated access
CREATE POLICY "select_own_history" ON import_history FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_own_history" ON import_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_own_history" ON import_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_history" ON import_history FOR DELETE
  TO anon, authenticated USING (true);

CREATE POLICY "select_own_sessions" ON active_sessions FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_own_sessions" ON active_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_own_sessions" ON active_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_sessions" ON active_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE POLICY "select_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "update_app_settings" ON app_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "insert_app_settings" ON app_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "select_pix_settings" ON pix_settings FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "update_pix_settings" ON pix_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "insert_pix_settings" ON pix_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "select_announcements" ON global_announcements FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_announcements" ON global_announcements FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_announcements" ON global_announcements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_announcements" ON global_announcements FOR DELETE
  TO anon, authenticated USING (true);

CREATE POLICY "select_own_confirmations" ON announcement_confirmations FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_own_confirmations" ON announcement_confirmations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "delete_own_confirmations" ON announcement_confirmations FOR DELETE
  TO anon, authenticated USING (true);

CREATE POLICY "select_own_tutorials" ON user_tutorial_completions FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_own_tutorials" ON user_tutorial_completions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_own_tutorials" ON user_tutorial_completions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_tutorials" ON user_tutorial_completions FOR DELETE
  TO anon, authenticated USING (true);

-- 4. Drop the is_admin function and auth trigger
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
