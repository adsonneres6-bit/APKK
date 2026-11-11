/*
# Active Conference Sessions Table

## Purpose
Persists the in-progress conference (conferência) state so it survives page
refreshes (F5) and browser restarts. The database is the single source of truth
for the active conference — no Local Storage is used for critical conference
data.

## New Table: active_sessions
- `id` (uuid, primary key) — same id as the import_history entry it tracks
- `user_id` (uuid, references profiles, defaults to auth.uid())
- `file_name` (text) — the imported file name
- `rows_data` (jsonb) — the raw imported rows
- `groups_data` (jsonb) — the delivery groups with sequencing
- `headers_data` (jsonb) — the column headers
- `check_state_data` (jsonb) — the full CheckState (checked map + spxToGroup map)
- `total_orders` (integer) — total number of orders
- `checked_count` (integer) — how many orders have been checked so far
- `completed` (boolean, default false) — whether the conference is fully done
- `updated_at` (timestamptz) — last time the session was saved
- `created_at` (timestamptz) — when the session was created

## Security
- RLS enabled.
- Owner-scoped CRUD: each authenticated user can only access their own active
  session rows.
- user_id defaults to auth.uid() so inserts that omit it still satisfy the
  WITH CHECK policy.

## Notes
1. Only ONE active session per user at a time (enforced by unique user_id).
2. When the conference completes, the row is deleted (not just marked
   completed) so a refresh after completion returns to the home screen.
3. The import_history row is kept for historical reference; the active_session
   row is the live working state.
*/

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  rows_data JSONB NOT NULL DEFAULT '[]',
  groups_data JSONB NOT NULL DEFAULT '[]',
  headers_data JSONB NOT NULL DEFAULT '[]',
  check_state_data JSONB NOT NULL DEFAULT '{"checked": {}, "spxToGroup": {}}',
  total_orders INTEGER NOT NULL DEFAULT 0,
  checked_count INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_active_session" ON active_sessions;
CREATE POLICY "select_own_active_session" ON active_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_active_session" ON active_sessions;
CREATE POLICY "insert_own_active_session" ON active_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_active_session" ON active_sessions;
CREATE POLICY "update_own_active_session" ON active_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_active_session" ON active_sessions;
CREATE POLICY "delete_own_active_session" ON active_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
