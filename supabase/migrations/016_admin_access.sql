-- ============================================================
-- Admin access: a small allowlist table + is_admin() helper, plus
-- additive "admins can view everything" SELECT policies on top of
-- the existing per-user policies.
--
-- To grant someone admin access, run once in the Supabase SQL editor
-- after they've signed up normally through /auth/sign-up:
--   INSERT INTO admin_users (user_id) VALUES ('<their-auth-uid>');
-- ============================================================

-- ── 1. Allowlist table ───────────────────────────────────────
-- No SELECT policy for authenticated/anon: only is_admin() (via
-- SECURITY DEFINER) and the service role can read this table, so
-- the admin list itself isn't exposed to regular queries.

CREATE TABLE IF NOT EXISTS admin_users (
  user_id   uuid        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  added_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ── 2. is_admin() helper ─────────────────────────────────────
-- SECURITY DEFINER so it can read admin_users despite that table
-- having no direct SELECT policy for regular users.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ── 3. Additive admin SELECT policies ────────────────────────
-- These sit alongside the existing "own row" SELECT policies
-- (Postgres RLS policies are OR'd together), so admins gain
-- read access to every row without touching existing behavior.

CREATE POLICY "Admins can view all challenge_results"
  ON challenge_results FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all wordle_results"
  ON wordle_results FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all stroop_results"
  ON stroop_results FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all serial_subtraction_results"
  ON serial_subtraction_results FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all digit_span_results"
  ON digit_span_results FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all structured_list_recall_results"
  ON structured_list_recall_results FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all official_challenge_workflows"
  ON official_challenge_workflows FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can view all coping_exercise_results"
  ON coping_exercise_results FOR SELECT
  USING (is_admin());

-- ── 4. Participant directory RPC ─────────────────────────────
-- auth.users isn't queryable directly by the authenticated role.
-- This function exposes just enough (id/email/created_at) for the
-- admin participant list, gated internally by is_admin().

CREATE OR REPLACE FUNCTION admin_list_participants()
RETURNS TABLE (
  user_id     uuid,
  email       text,
  created_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.email, u.created_at
  FROM auth.users u
  WHERE is_admin()
  ORDER BY u.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION admin_list_participants() TO authenticated;
