/*
# Add tutorial_url column to app_settings

1. Modified Tables
- `app_settings`
  - New column `tutorial_url` (text, nullable, default empty string).
  - Stores the URL configured by the admin that will be rendered inside an
    iframe on the profile page's Tutorial button modal.

2. Security
- No RLS changes. The existing policies on `app_settings` already govern
  access (admin-only writes, authenticated reads). No new policy needed
  because the column is covered by the existing row-level policies.

3. Important Notes
- The column is nullable with a default of empty string so existing rows
  are backfilled automatically and the app treats an empty value as
  "no tutorial configured" (button stays hidden).
*/

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS tutorial_url text NOT NULL DEFAULT '';
