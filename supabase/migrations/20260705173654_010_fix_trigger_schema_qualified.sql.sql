-- Fix handle_new_user: use fully qualified table names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, is_admin, active, created_at)
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
  INSERT INTO public.trigger_logs (user_id, action, message)
  VALUES (NEW.id, 'error', SQLERRM);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;