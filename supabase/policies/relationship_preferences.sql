-- =====================================================================
-- supabase/policies/relationship_preferences.sql
--
-- 관계 선호 (FR-C05) RLS 정책.
--
-- 핵심 원칙:
-- 1. 자신의 관계 선호만 SELECT 가능.
-- 2. 다른 사용자의 선호는 모바일에서 어떤 경우에도 SELECT 불가
--    (추천 알고리즘 내부에서만 사용, NestJS service role 만 조회).
-- 3. INSERT/UPDATE/DELETE 는 NestJS 만.
-- =====================================================================

ALTER TABLE relationship_preferences ENABLE ROW LEVEL SECURITY;

-- 자신의 선호 SELECT
DROP POLICY IF EXISTS "select_own_relationship_preference" ON relationship_preferences;
CREATE POLICY "select_own_relationship_preference" ON relationship_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE 정책 없음 → service role 만 가능
