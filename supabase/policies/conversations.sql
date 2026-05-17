-- =====================================================================
-- supabase/policies/conversations.sql
--
-- 대화방 RLS 정책 (FR-G).
--
-- 핵심 원칙:
-- 1. 참여한 사용자만 SELECT 가능.
-- 2. INSERT/UPDATE/DELETE 는 NestJS service role 만 (매칭 트랜잭션, 만료 처리).
-- =====================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations" ON conversations
  FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- INSERT/UPDATE/DELETE 정책 없음 → service role 만
