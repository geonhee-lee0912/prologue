-- =====================================================================
-- supabase/policies/matches.sql
--
-- 매칭 RLS 정책 (FR-F).
--
-- 핵심 원칙:
-- 1. 매칭의 양쪽 사용자만 SELECT 가능 (다른 사용자에게 매칭 정보 노출 금지).
-- 2. INSERT/UPDATE/DELETE 는 NestJS service role 만 수행
--    (매칭 생성은 양방향 관심 검증 + 차단/제재 검증 필요).
-- =====================================================================

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 자신이 참여한 매칭만 SELECT
DROP POLICY IF EXISTS "select_own_matches" ON matches;
CREATE POLICY "select_own_matches" ON matches
  FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- INSERT/UPDATE/DELETE 정책 없음 → service role 만
