/*
# Fix clear_import_history_all return type

Drop and recreate with JSON return type so the edge function can parse
the result unambiguously via the Supabase JS client (.rpc()).
*/

DROP FUNCTION IF EXISTS public.clear_import_history_all();

CREATE OR REPLACE FUNCTION public.clear_import_history_all()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_history BIGINT;
  v_deleted_sessions BIGINT;
BEGIN
  SELECT count(*) INTO v_deleted_history FROM public.import_history;
  SELECT count(*) INTO v_deleted_sessions FROM public.active_sessions;

  TRUNCATE TABLE public.import_history RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.active_sessions RESTART IDENTITY CASCADE;

  RETURN json_build_object(
    'deleted_history', v_deleted_history,
    'deleted_sessions', v_deleted_sessions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_import_history_all() TO authenticated;
