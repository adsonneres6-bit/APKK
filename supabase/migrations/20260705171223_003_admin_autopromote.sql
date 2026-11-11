/*
# Handle Admin User Auto-Promotion

## Overview
Updates the handle_new_user trigger to automatically promote users signing up with the admin email.

## Changes
1. Modifies handle_new_user function to detect admin email
2. Sets is_admin = true for admin email users

## Admin Credentials
- Email: admin0610@gmail.com
- Password: 061012 (user must signup with this)
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone, is_admin, active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone',
    -- Auto-promote admin email
    NEW.email = 'admin0610@gmail.com' OR (NEW.raw_user_meta_data->>'is_admin')::boolean,
    true,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also update any existing profile for admin email
UPDATE profiles p
SET is_admin = true
WHERE p.id IN (
  SELECT id FROM auth.users WHERE email = 'admin0610@gmail.com'
);
