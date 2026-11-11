/*
# Initial Schema for Romaneio SPX System

## Overview
Creates the complete database schema for a multi-user delivery management system with:
- User profiles extending Supabase Auth
- License management with trial support
- Import/export history tracking
- Payment infrastructure (prepared for future integration)
- Application settings (Pix configuration)

## Tables Created

### profiles
Extends Supabase auth.users with additional user information:
- id (uuid, primary key, references auth.users)
- name (text, not null)
- phone (text, nullable)
- is_admin (boolean, default false)
- active (boolean, default true)
- created_at (timestamptz, default now())
- last_login (timestamptz, nullable)

### licenses
Manages user access licenses:
- id (uuid, primary key)
- user_id (uuid, references profiles, unique)
- days (integer, not null)
- is_free_trial (boolean, default false)
- created_at (timestamptz, default now())
- expires_at (date, not null)

### import_history
Tracks user import/export operations:
- id (uuid, primary key)
- user_id (uuid, references profiles)
- file_name (text)
- total_orders (integer)
- total_groups (integer)
- checked_groups (integer)
- import_time (timestamptz)
- export_time (timestamptz, nullable)
- rows_data (jsonb)
- groups_data (jsonb)
- headers_data (jsonb)
- check_state_data (jsonb)
- created_at (timestamptz, default now())

### payments
Prepared for payment integration:
- id (uuid, primary key)
- user_id (uuid, references profiles)
- amount (decimal)
- status (text)
- transaction_id (text, nullable)
- payment_method (text, nullable)
- created_at (timestamptz, default now())

### pix_settings
Pix configuration (admin only):
- id (uuid, primary key)
- pix_key (text)
- receiver_name (text)
- city (text)
- message (text, nullable)
- updated_at (timestamptz, default now())

### app_settings
Application-wide settings:
- id (uuid, primary key)
- show_license_to_users (boolean, default true)
- updated_at (timestamptz, default now())

## Security
- RLS enabled on all tables
- User-scoped policies: users can only access their own data
- Admin-scoped policies: admins can access all data
- Public tables: none (all require authentication)
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  days INTEGER NOT NULL,
  is_free_trial BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at DATE NOT NULL,
  UNIQUE(user_id)
);

-- Import history table
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_groups INTEGER NOT NULL DEFAULT 0,
  checked_groups INTEGER NOT NULL DEFAULT 0,
  import_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  export_time TIMESTAMPTZ,
  rows_data JSONB NOT NULL DEFAULT '[]',
  groups_data JSONB NOT NULL DEFAULT '[]',
  headers_data JSONB NOT NULL DEFAULT '[]',
  check_state_data JSONB NOT NULL DEFAULT '{"checked": {}, "spxToGroup": {}}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table (prepared for future integration)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pix settings table (admin only)
CREATE TABLE IF NOT EXISTS pix_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pix_key TEXT,
  receiver_name TEXT,
  city TEXT,
  message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_license_to_users BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default app settings if not exists
INSERT INTO app_settings (show_license_to_users)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM app_settings);

-- Insert default pix settings if not exists
INSERT INTO pix_settings (pix_key, receiver_name, city)
SELECT '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM pix_settings);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR is_admin()) WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "delete_profile" ON profiles;
CREATE POLICY "delete_profile" ON profiles FOR DELETE
  TO authenticated USING (is_admin());

-- Licenses policies
DROP POLICY IF EXISTS "select_own_license" ON licenses;
CREATE POLICY "select_own_license" ON licenses FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "insert_license" ON licenses;
CREATE POLICY "insert_license" ON licenses FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "update_license" ON licenses;
CREATE POLICY "update_license" ON licenses FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "delete_license" ON licenses;
CREATE POLICY "delete_license" ON licenses FOR DELETE
  TO authenticated USING (is_admin());

-- Import history policies
DROP POLICY IF EXISTS "select_own_history" ON import_history;
CREATE POLICY "select_own_history" ON import_history FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "insert_own_history" ON import_history;
CREATE POLICY "insert_own_history" ON import_history FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "update_own_history" ON import_history;
CREATE POLICY "update_own_history" ON import_history FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR is_admin()) WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "delete_own_history" ON import_history;
CREATE POLICY "delete_own_history" ON import_history FOR DELETE
  TO authenticated USING (user_id = auth.uid() OR is_admin());

-- Payments policies
DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "insert_payment" ON payments;
CREATE POLICY "insert_payment" ON payments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "update_payment" ON payments;
CREATE POLICY "update_payment" ON payments FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Pix settings policies (admin only)
DROP POLICY IF EXISTS "select_pix_settings" ON pix_settings;
CREATE POLICY "select_pix_settings" ON pix_settings FOR SELECT
  TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "update_pix_settings" ON pix_settings;
CREATE POLICY "update_pix_settings" ON pix_settings FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- App settings policies
DROP POLICY IF EXISTS "select_app_settings" ON app_settings;
CREATE POLICY "select_app_settings" ON app_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_app_settings" ON app_settings;
CREATE POLICY "update_app_settings" ON app_settings FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_import_history_user_id ON import_history(user_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_pix_settings_updated_at ON pix_settings;
CREATE TRIGGER update_pix_settings_updated_at
  BEFORE UPDATE ON pix_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone, is_admin, active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone',
    false,
    true,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
