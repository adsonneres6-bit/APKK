/*
# Create Admin User via SQL

## Credentials
- Email: admin0610@gmail.com
- Password: 061012
*/

-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Check and create admin user if not exists
DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
  existing_id UUID;
BEGIN
  -- Check if admin exists
  SELECT id INTO existing_id FROM auth.users WHERE email = 'admin0610@gmail.com';
  
  IF existing_id IS NULL THEN
    -- Insert user
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
      crypt('061012', gen_salt('bf')),
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
    
    RAISE NOTICE 'Admin user created with ID: %', admin_id;
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', existing_id;
  END IF;
END $$;
