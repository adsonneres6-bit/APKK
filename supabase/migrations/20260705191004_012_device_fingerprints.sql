-- Device fingerprints table for trial control
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  trial_used BOOLEAN NOT NULL DEFAULT false,
  trial_started_at TIMESTAMPTZ,
  trial_expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fingerprint ON device_fingerprints(fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON device_fingerprints(user_id);

-- Enable RLS
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "select_own_fingerprint" ON device_fingerprints FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "insert_fingerprint" ON device_fingerprints FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_fingerprint" ON device_fingerprints FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());