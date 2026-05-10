-- =====================================================================
-- supabase/policies/user_actions.sql
--
-- 사용자 액션 (관심/넘기기/조회 등) RLS 정책.
--
-- 핵심 원칙:
-- 1. user_actions 는 모바일에 SELECT 자체를 허용하지 않는다.
--    - 내가 관심을 보낸 사람 목록은 별도 view 또는 NestJS API 로 제공
--    - 자신의 거절 사유조차 모바일에서 보이지 않게 함 (혼란 방지)
-- 2. INSERT/UPDATE/DELETE 는 NestJS service role 만 수행.
-- 3. 다른 사용자의 액션은 어떤 경우에도 노출되지 않는다.
-- =====================================================================

ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SELECT 정책: 모바일에 허용하지 않음
-- =====================================================================

-- 모바일에서 user_actions 전체 SELECT 권한 회수
REVOKE SELECT ON user_actions FROM anon, authenticated;

-- service role 만 모든 컬럼 접근 가능
GRANT ALL ON user_actions TO service_role;

-- =====================================================================
-- 사용자에게 자신의 액션 일부를 보여줘야 한다면 별도 view 사용
--
-- 예시: "내가 관심을 보낸 사람 목록" 화면을 위한 view
-- =====================================================================

CREATE OR REPLACE VIEW my_interests AS
SELECT
  ua.id,
  ua.target_user_id,
  ua.action_type,
  ua.created_at
FROM user_actions ua
WHERE ua.user_id = auth.uid()::text
  AND ua.action_type = 'send_interest';

-- view 에 SELECT 권한 부여 (skip_reason 은 view 에 포함되지 않음)
GRANT SELECT ON my_interests TO authenticated;

-- view 에도 RLS 적용 (Postgres 16+ 의 security_invoker 사용)
ALTER VIEW my_interests SET (security_invoker = on);

-- =====================================================================
-- 검증 쿼리
-- =====================================================================

-- 거절 사유는 어떤 사용자도 모바일에서 SELECT 불가:
--   SET ROLE authenticated;
--   SET request.jwt.claim.sub TO '<user-id>';
--   SELECT skip_reason FROM user_actions;
--   -> ERROR: permission denied for table user_actions
