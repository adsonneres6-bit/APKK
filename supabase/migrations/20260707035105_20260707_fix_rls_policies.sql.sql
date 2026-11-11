/*
# Fix missing INSERT policy on pix_settings and device_fingerprints

## Problems
1. pix_settings lacks INSERT policy - frontend cannot create initial row if missing
2. device_fingerprints INSERT has `WITH CHECK (true)` but SELECT requires user_id - may cause visibility issues

## Solutions
1. Add INSERT policy for pix_settings (admin only)
2. Fix device_fingerprints INSERT to properly validate user_id
*/

-- Fix pix_settings: Add INSERT policy for admin
DROP POLICY IF EXISTS "insert_pix_settings" ON pix_settings;
CREATE POLICY "insert_pix_settings" ON pix_settings FOR INSERT
  TO authenticated WITH CHECK (is_admin());

-- Fix device_fingerprints: Ensure proper user_id on INSERT
DROP POLICY IF EXISTS "insert_fingerprint" ON device_fingerprints;
CREATE POLICY "insert_fingerprint" ON device_fingerprints FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin() OR user_id IS NULL);

-- Add index for device_fingerprints lookups
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_trial_expires_at ON device_fingerprints(trial_expires_at);
