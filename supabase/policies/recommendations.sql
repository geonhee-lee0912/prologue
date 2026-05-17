-- =====================================================================
-- supabase/policies/recommendations.sql
--
-- 추천 데이터 RLS 정책.
--
-- 핵심 원칙:
-- 1. 사용자는 자신이 받은 추천만 SELECT 할 수 있다.
-- 2. 점수 컬럼 (total_score, trust_score, ..., profile_quality_score) 은
--    어떤 정책으로도 모바일에 노출하지 않는다.
-- 3. 추천 생성, 상태 변경 (shown/interested/skipped) 은 NestJS 가
--    service role 로만 수행한다. 모바일은 INSERT/UPDATE/DELETE 불가.
-- =====================================================================

-- RLS 활성화
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SELECT 정책
-- =====================================================================

-- 사용자는 자신이 받은 추천만 SELECT 가능
DROP POLICY IF EXISTS "select_own_recommendations" ON recommendations;
CREATE POLICY "select_own_recommendations" ON recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================================
-- INSERT/UPDATE/DELETE 정책
-- =====================================================================

-- 모바일은 어떤 변경도 할 수 없다 (NestJS service role 만 가능)
-- 명시적 정책을 추가하지 않으면 RLS 가 거부한다.
-- (service role 은 RLS 를 우회하므로 NestJS 에서는 동작)

-- =====================================================================
-- 컬럼 단위 노출 제한
--
-- 점수 컬럼은 anon/authenticated 역할에 SELECT 권한 자체를 부여하지 않는다.
-- service role 만 SELECT 가능.
-- =====================================================================

-- 먼저 모든 권한 회수
REVOKE SELECT ON recommendations FROM anon, authenticated;

-- 사용자에게 노출 가능한 컬럼만 SELECT 권한 부여
GRANT SELECT (
  id,
  user_id,
  target_user_id,
  recommendation_date,
  rank,
  status,
  shown_at,
  created_at,
  updated_at
) ON recommendations TO authenticated;

-- service role 은 모든 컬럼 접근 가능 (점수 포함)
GRANT ALL ON recommendations TO service_role;

-- =====================================================================
-- 검증 쿼리 (개발 시 직접 확인용)
-- =====================================================================

-- 인증된 사용자가 점수 컬럼 SELECT 시도 시 에러가 발생하는지 확인:
--   SET ROLE authenticated;
--   SET request.jwt.claim.sub TO '<user-id>';
--   SELECT total_score FROM recommendations LIMIT 1;
--   -> ERROR: permission denied for column total_score
