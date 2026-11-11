/*
# Add INSERT policy to app_settings

1. Security
- Adds an INSERT policy so admin users can insert new settings rows.
- This complements the existing SELECT (public to authenticated) and
  UPDATE (admin-only) policies. Without an INSERT policy, an upsert
  that needs to insert (no existing row) would fail RLS.

2. Important Notes
- The policy is scoped to admin only via is_admin(), matching the
  existing UPDATE policy.
- Idempotent: drops the policy first if it already exists.
*/

DROP POLICY IF EXISTS "insert_app_settings" ON app_settings;
CREATE POLICY "insert_app_settings"
ON app_settings FOR INSERT
TO authenticated
WITH CHECK (is_admin());
