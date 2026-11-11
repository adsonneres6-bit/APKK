-- Fix handle_new_user function with exception handling
-- This prevents the trigger from rolling back the signup transaction

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone, is_admin, active, created_at)
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
  -- Log error but don't fail the signup
  RAISE NOTICE 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the admin user with proper password hash
DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
  existing_id UUID;
BEGIN
  -- Check if admin exists
  SELECT id INTO existing_id FROM auth.users WHERE email = 'admin0610@gmail.com';
  
  IF existing_id IS NULL THEN
    -- Insert user with bcrypt cost 10 (Supabase Auth requirement)
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      admin_id,
      'authenticated',
      'authenticated',
      'admin0610@gmail.com',
      crypt('061012', gen_salt('bf', 10)),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Administrador","is_admin":true}'
    );
    
    -- Insert identity
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_id,
      admin_id,
      'admin0610@gmail.com',
      jsonb_build_object('sub', admin_id::text, 'email', 'admin0610@gmail.com'),
      'email',
      now(),
      now(),
      now()
    );
    
    -- Insert profile (trigger should handle this, but do it explicitly too)
    INSERT INTO profiles (id, name, is_admin, active, created_at)
    VALUES (admin_id, 'Administrador', true, true, now())
    ON CONFLICT (id) DO UPDATE SET is_admin = true, active = true;
    
    RAISE NOTICE 'Admin user created with ID: %', admin_id;
  ELSE
    -- Update existing admin
    UPDATE auth.users 
    SET 
      encrypted_password = crypt('061012', gen_salt('bf', 10)),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"name":"Administrador","is_admin":true}'
    WHERE id = existing_id;
    
    -- Update profile
    INSERT INTO profiles (id, name, is_admin, active, created_at)
    VALUES (existing_id, 'Administrador', true, true, now())
    ON CONFLICT (id) DO UPDATE SET is_admin = true, active = true;
    
    RAISE NOTICE 'Admin user updated with ID: %', existing_id;
  END IF;
END $$;
