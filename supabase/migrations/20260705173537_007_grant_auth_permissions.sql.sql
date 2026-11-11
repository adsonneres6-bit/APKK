-- Grant necessary permissions to supabase_auth_admin for trigger function
GRANT INSERT ON profiles TO supabase_auth_admin;

-- Also grant to authenticator (runs the initial connection)
GRANT INSERT ON profiles TO authenticator;