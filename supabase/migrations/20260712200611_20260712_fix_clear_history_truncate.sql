/*
# Fix clear_import_history_all to use TRUNCATE

## Purpose
Replaces `DELETE FROM` with `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`
inside the `clear_import_history_all()` RPC function.

## Why
PostgREST (the Supabase REST API layer) enforces a "DELETE requires a WHERE
clause" safety check. When an RPC function containing `DELETE FROM` (without
a WHERE) is invoked through the Supabase JS client's `.rpc()` method, the
postgREST layer can intercept and block the operation. `TRUNCATE` is not
subject to this check and is the correct SQL command for removing all rows
from a table. `RESTART IDENTITY` resets serial/identity sequences, and
`CASCADE` ensures any foreign-key dependents are also cleared.

## Changes
- `clear_import_history_all()` rewritten to use TRUNCATE for both
  `import_history` and `active_sessions`.
- Return columns unchanged (deleted_history, deleted_sessions) for
  backward compatibility with the edge function and frontend.
- TRUNCATE doesn't support GET DIAGNOSTICS ROW_COUNT reliably, so counts
  are fetched before truncating.
*/

CREATE OR REPLACE FUNCTION public.clear_import_history_all()
RETURNS TABLE(deleted_history BIGINT, deleted_sessions BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_history BIGINT;
  v_deleted_sessions BIGINT;
BEGIN
  -- Count rows before truncating (TRUNCATE doesn't support GET DIAGNOSTICS)
  SELECT count(*) INTO v_deleted_history FROM public.import_history;
  SELECT count(*) INTO v_deleted_sessions FROM public.active_sessions;

  -- TRUNCATE removes all rows, resets identity sequences, and cascades to FK dependents
  TRUNCATE TABLE public.import_history RESTART IDENTITY CASCADE;
  TRUNCATE TABLE public.active_sessions RESTART IDENTITY CASCADE;

  RETURN QUERY SELECT v_deleted_history, v_deleted_sessions;
END;
$$;
