-- =====================================================================
-- supabase/policies/profiles.sql
--
-- 프로필 RLS 정책.
--
-- 핵심 원칙:
-- 1. 사용자는 자신의 프로필 SELECT/UPDATE 가능.
-- 2. 매칭된 상대의 프로필만 SELECT 가능. 소개(introduction) 받은 상대의 프로필은
--    소개 테이블이 생길 때 다시 설계한다 (옛 추천 테이블은 2026-09-17 정리로 없어졌다).
-- 3. 무관한 다른 사용자 프로필 SELECT 불가.
-- 4. INSERT/DELETE 는 NestJS service role 만 수행.
-- =====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SELECT 정책
-- =====================================================================

-- 자신의 프로필
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 옛 추천 정책 — 테이블이 없어졌다. 남아 있는 DB 에서도 지운다
DROP POLICY IF EXISTS "select_recommended_profile" ON profiles;

-- 자신이 매칭된 상대의 프로필
DROP POLICY IF EXISTS "select_matched_profile" ON profiles;
CREATE POLICY "select_matched_profile" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.status = 'active'
        AND (
          (m.user_a_id = auth.uid() AND m.user_b_id = profiles.user_id)
          OR (m.user_b_id = auth.uid() AND m.user_a_id = profiles.user_id)
        )
    )
  );

-- =====================================================================
-- UPDATE 정책
-- =====================================================================

-- 자신의 프로필만 UPDATE 가능
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- INSERT/DELETE 는 정책 없음 (service role 만 가능)
-- =====================================================================

-- =====================================================================
-- 컬럼 단위 노출 제한
--
-- profiles 테이블의 review_status 와 completion_score 같은 운영 컬럼은
-- 본인에게는 보여주되 다른 사용자에게는 가리는 것이 안전.
-- 정책상 자신의 row 만 보이므로 컬럼 단위 차단은 별도로 두지 않음.
-- 단, 운영자 메모 등 민감 컬럼이 추가되면 GRANT/REVOKE 패턴 사용.
-- =====================================================================
