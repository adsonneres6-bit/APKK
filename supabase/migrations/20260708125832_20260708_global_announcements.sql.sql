-- Global Announcements System
-- Stores announcements that can be displayed to all users

CREATE TABLE IF NOT EXISTS global_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_location TEXT NOT NULL DEFAULT 'after_login' CHECK (display_location IN ('login', 'after_login')),
  show_once_per_user BOOLEAN NOT NULL DEFAULT true,
  require_confirmation BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracks which users have confirmed/read which announcements
CREATE TABLE IF NOT EXISTS announcement_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES global_announcements(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE global_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_confirmations ENABLE ROW LEVEL SECURITY;

-- Policies for global_announcements
-- Anyone can read active announcements (including anonymous for login screen)
DROP POLICY IF EXISTS "select_active_announcements" ON global_announcements;
CREATE POLICY "select_active_announcements" ON global_announcements FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- Admins can manage all announcements
DROP POLICY IF EXISTS "manage_announcements_admin" ON global_announcements;
CREATE POLICY "manage_announcements_admin" ON global_announcements FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Policies for announcement_confirmations
-- Users can read their own confirmations
DROP POLICY IF EXISTS "select_own_confirmations" ON announcement_confirmations;
CREATE POLICY "select_own_confirmations" ON announcement_confirmations FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

-- Users can insert their own confirmations
DROP POLICY IF EXISTS "insert_own_confirmations" ON announcement_confirmations;
CREATE POLICY "insert_own_confirmations" ON announcement_confirmations FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_global_announcements_updated_at ON global_announcements;
CREATE TRIGGER update_global_announcements_updated_at
  BEFORE UPDATE ON global_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_announcements_is_active ON global_announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_global_announcements_display_location ON global_announcements(display_location);
CREATE INDEX IF NOT EXISTS idx_global_announcements_dates ON global_announcements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_announcement_confirmations_user ON announcement_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_confirmations_announcement ON announcement_confirmations(announcement_id);