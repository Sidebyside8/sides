-- Run this in your Supabase SQL Editor before testing.
-- Everything is idempotent (safe to run more than once).

-- 1. Columns needed by incognito + boost (is_incognito you already added; included here for safety)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_incognito boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS boosted_until timestamptz;

-- 2. Profile views table — powers "Who Viewed Me"
CREATE TABLE IF NOT EXISTS profile_views (
  viewer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  viewed_id uuid REFERENCES users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  PRIMARY KEY (viewer_id, viewed_id)
);

-- 3. Row-level security for profile_views
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "record own views" ON profile_views;
CREATE POLICY "record own views" ON profile_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "update own views" ON profile_views;
CREATE POLICY "update own views" ON profile_views
  FOR UPDATE USING (auth.uid() = viewer_id);

DROP POLICY IF EXISTS "see views of me" ON profile_views;
CREATE POLICY "see views of me" ON profile_views
  FOR SELECT USING (auth.uid() = viewed_id OR auth.uid() = viewer_id);
