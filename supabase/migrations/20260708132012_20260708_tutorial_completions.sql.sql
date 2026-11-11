-- Track tutorial completions per user
CREATE TABLE IF NOT EXISTS user_tutorial_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tutorial_type TEXT NOT NULL CHECK (tutorial_type IN ('flex', 'interface', 'frota')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tutorial_type)
);

-- Enable RLS
ALTER TABLE user_tutorial_completions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "select_own_completions" ON user_tutorial_completions;
CREATE POLICY "select_own_completions" ON user_tutorial_completions FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "insert_own_completions" ON user_tutorial_completions;
CREATE POLICY "insert_own_completions" ON user_tutorial_completions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tutorial_completions_user ON user_tutorial_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_completions_type ON user_tutorial_completions(tutorial_type);