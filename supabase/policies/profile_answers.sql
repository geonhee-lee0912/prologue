-- =====================================================================
-- supabase/policies/profile_answers.sql
--
-- 프로필 문답 (FR-C04, FR-C05) RLS 정책.
--
-- 핵심 원칙:
-- 1. 자신의 답변만 SELECT 가능 (자기 프로필 미리보기용).
-- 2. 다른 사용자의 답변은 NestJS API 를 통해서만 조회 (추천/상세 프로필).
-- 3. INSERT/UPDATE/DELETE 는 모바일 직접 금지, NestJS service role 만.
-- =====================================================================

ALTER TABLE profile_answers ENABLE ROW LEVEL SECURITY;

-- 자신의 문답 SELECT
DROP POLICY IF EXISTS "select_own_profile_answers" ON profile_answers;
CREATE POLICY "select_own_profile_answers" ON profile_answers
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE 정책 없음 → service role 만 가능
