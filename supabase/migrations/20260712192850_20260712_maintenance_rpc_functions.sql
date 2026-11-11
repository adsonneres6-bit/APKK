/*
# Maintenance RPC Functions

## Purpose
Creates two PostgreSQL functions for the admin Maintenance screen:
1. `clear_import_history_all()` – removes ALL import-related data across every user.
2. `add_days_to_all_users(days INT)` – adds days to every non-admin user's license expiry.

## What `clear_import_history_all` removes
- All rows from `import_history` (XLSX + PDF history, logs, temp data).
- All rows from `active_sessions` (in-progress / temporary session data).
- Storage objects in the `import-files` bucket, if it exists, are cleaned separately
  by the edge function (the DB function only handles table rows).

## What `clear_import_history_all` preserves
- profiles, licenses, payments, referrals, referral_codes, referral_bonuses.
- app_settings, pix_settings, device_fingerprints, user_devices.
- All admin / configuration / tutorial / announcement data.

## `add_days_to_all_users(days INT)`
- Adds `days` to `expires_at` of every `licenses` row whose owner is NOT an admin
  and whose profile is active.
- Only adds days (never subtracts). If a license has already expired, the days are
  added from today's date so the user gets a fresh window.
- Returns the count of updated licenses.
- `days` must be a positive integer (> 0); the function raises an exception otherwise.

## Security
Both functions are `SECURITY DEFINER` so they can bypass RLS, but they are only
invoked from edge functions that verify the caller is an admin before calling.
The functions themselves do NOT re-check admin status — that is the edge
function's responsibility.
*/

-- =============================================================
-- 1. clear_import_history_all()
-- =============================================================
CREATE OR REPLACE FUNCTION public.clear_import_history_all()
RETURNS TABLE(deleted_history BIGINT, deleted_sessions BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_history BIGINT;
  v_deleted_sessions BIGINT;
BEGIN
  -- Remove all import history rows (XLSX + PDF logs, temp data)
  DELETE FROM public.import_history;
  GET DIAGNOSTICS v_deleted_history = ROW_COUNT;

  -- Remove all active sessions (temporary in-progress data)
  DELETE FROM public.active_sessions;
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_history, v_deleted_sessions;
END;
$$;

-- =============================================================
-- 2. add_days_to_all_users(days INT)
-- =============================================================
CREATE OR REPLACE FUNCTION public.add_days_to_all_users(p_days INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_today DATE := CURRENT_DATE;
BEGIN
  IF p_days IS NULL OR p_days <= 0 THEN
    RAISE EXCEPTION 'A quantidade de dias deve ser um número inteiro positivo maior que zero.';
  END IF;

  -- Add days to every non-admin, active user's license.
  -- If the license is already expired (expires_at < today), start from today.
  UPDATE public.licenses l
  SET expires_at = GREATEST(l.expires_at, v_today) + p_days,
      days = l.days + p_days
  FROM public.profiles p
  WHERE l.user_id = p.id
    AND p.is_admin = false
    AND p.active = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Grant execute to authenticated (edge functions use service role which bypasses grants)
GRANT EXECUTE ON FUNCTION public.clear_import_history_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_days_to_all_users(INT) TO authenticated;
