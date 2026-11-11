/*
# User Devices Table and Max Devices Configuration

## Purpose
Implements device control to limit the number of devices per user account.

## New Table: user_devices
- `id` (uuid, primary key) — unique identifier
- `user_id` (uuid, references profiles) — the user who owns this device
- `device_id` (text, unique per user) — fingerprint-based identifier (FingerprintJS visitorId)
- `os` (text) — operating system (e.g., "Windows", "macOS", "Android")
- `os_version` (text) — OS version
- `browser` (text) — browser name (e.g., "Chrome", "Firefox", "Safari")
- `browser_version` (text) — browser version
- `language` (text) — browser language
- `screen_resolution` (text) — screen resolution (e.g., "1920x1080")
- `timezone` (text) — timezone (e.g., "America/Sao_Paulo")
- `first_access_at` (timestamptz) — when this device was first registered
- `last_access_at` (timestamptz) — when this device was last used
- `is_active` (boolean, default true) — whether this device is active
- `created_at` (timestamptz) — record creation timestamp

## App Settings Update
Adds `max_devices_per_user` column to control the maximum number of devices per user.

## Security
- RLS enabled
- Owner-scoped SELECT (users can only see their own devices)
- Admin has full access

## Notes
1. Each user can have multiple devices up to the configurable limit (default 2)
2. Admins can remove devices to free up slots
3. The limit is configurable via app_settings table
*/

-- Add max_devices_per_user to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS max_devices_per_user INTEGER DEFAULT 2;

-- Create user_devices table
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  os TEXT,
  os_version TEXT,
  browser TEXT,
  browser_version TEXT,
  language TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  first_access_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_access_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_is_active ON user_devices(is_active);

-- Enable RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "select_own_devices" ON user_devices FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "insert_own_device" ON user_devices FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_devices_admin" ON user_devices FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "delete_devices_admin" ON user_devices FOR DELETE
  TO authenticated USING (is_admin());

-- Add comment
COMMENT ON TABLE user_devices IS 'Stores registered devices for each user to control device limits';
