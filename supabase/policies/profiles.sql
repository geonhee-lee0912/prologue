-- =====================================================================
-- supabase/policies/profiles.sql
--
-- 프로필 RLS 정책.
--
-- 핵심 원칙:
-- 1. 사용자는 자신의 프로필 SELECT/UPDATE 가능.
-- 2. 자신에게 추천된 상대 또는 매칭된 상대의 프로필만 SELECT 가능.
-- 3. 무관한 다른 사용자 프로필 SELECT 불가.
-- 4. INSERT/DELETE 는 NestJS service role 만 수행.
-- =====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SELECT 정책
-- =====================================================================

-- 자신의 프로필
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 자신이 받은 추천의 대상 프로필
CREATE POLICY "select_recommended_profile" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recommendations r
      WHERE r.user_id = auth.uid()
        AND r.target_user_id = profiles.user_id
        AND r.status IN ('created', 'shown', 'interested', 'skipped')
    )
  );

-- 자신이 매칭된 상대의 프로필
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
