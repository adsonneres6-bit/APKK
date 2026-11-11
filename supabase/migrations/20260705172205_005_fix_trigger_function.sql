/*
# Fix handle_new_user Trigger

## Problem
The boolean cast `(NEW.raw_user_meta_data->>'is_admin')::boolean` fails when the value is NULL.

## Solution
Use COALESCE to handle NULL values safely.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone, is_admin, active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone',
    -- Auto-promote admin email or check is_admin metadata
    NEW.email = 'admin0610@gmail.com' OR COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
