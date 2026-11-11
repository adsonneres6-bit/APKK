-- Create a log table to track trigger execution
CREATE TABLE IF NOT EXISTS public.trigger_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Grant access
GRANT INSERT ON public.trigger_logs TO supabase_auth_admin;
GRANT INSERT ON public.trigger_logs TO authenticator;

-- Update handle_new_user to log
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that trigger fired
  INSERT INTO public.trigger_logs (user_id, action, message)
  VALUES (NEW.id, 'trigger_fired', 'Trigger started for: ' || NEW.email);
  
  INSERT INTO profiles (id, name, phone, is_admin, active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone',
    NEW.email = 'admin0610@gmail.com' OR COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false),
    true,
    now()
  );
  
  INSERT INTO public.trigger_logs (user_id, action, message)
  VALUES (NEW.id, 'profile_created', 'Profile created successfully');
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.trigger_logs (user_id, action, message)
  VALUES (NEW.id, 'error', SQLERRM);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;