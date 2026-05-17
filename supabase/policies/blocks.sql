-- =====================================================================
-- supabase/policies/blocks.sql
--
-- 차단 RLS 정책 (FR-H02).
--
-- 핵심 원칙:
-- 1. 차단한 사람(blocker)은 자기가 만든 차단 row 를 SELECT 가능.
--    → 모바일 "차단 목록" 화면에 사용 (MVP 후순위 화면이지만 RLS 는 준비).
-- 2. 차단당한 사람(blocked)에게는 자기가 차단당한 사실 노출 금지
--    → blocked_id = auth.uid() 인 row 를 SELECT 못 함.
-- 3. INSERT/DELETE 는 NestJS service role 만 (양방향 부작용 트랜잭션).
-- =====================================================================

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- 자기가 만든 차단 row 만 SELECT
DROP POLICY IF EXISTS "select_own_blocks" ON blocks;
CREATE POLICY "select_own_blocks" ON blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- 모바일 직접 변경 차단
REVOKE INSERT, UPDATE, DELETE ON blocks FROM anon, authenticated;

-- NestJS 서비스만 변경 가능
GRANT ALL ON blocks TO service_role;
