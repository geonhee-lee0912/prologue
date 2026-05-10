-- =====================================================================
-- supabase/policies/messages.sql
--
-- 메시지 RLS 정책.
--
-- 핵심 원칙:
-- 1. 참여한 대화방의 메시지만 SELECT 가능.
-- 2. 메시지 INSERT 는 모바일에서 직접 하지 않는다.
--    NestJS API 가 검증 (대화 만료, 차단, 금지 표현) 후 INSERT.
-- 3. 메시지 수정/삭제는 모바일에서 불가. 운영 정책상 soft delete 만 허용.
-- 4. Realtime 구독 시에도 RLS 가 적용된다.
-- =====================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SELECT 정책
-- =====================================================================

-- 사용자는 자신이 참여한 대화방의 메시지만 SELECT 가능
CREATE POLICY "select_messages_in_my_conversations" ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user_a_id = auth.uid()::text OR c.user_b_id = auth.uid()::text)
    )
    -- soft deleted 메시지는 모바일에 보이지 않음
    AND messages.deleted_at IS NULL
  );

-- =====================================================================
-- INSERT/UPDATE/DELETE 정책: 모바일 불가
-- =====================================================================

-- 모바일에서 messages INSERT/UPDATE/DELETE 권한 부여하지 않음
-- (NestJS service role 만 수행)

-- =====================================================================
-- Realtime 구독 활성화
--
-- Supabase 대시보드 또는 SQL 로 messages 테이블의 Realtime 활성화 필요:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
--
-- 구독 시 RLS 가 자동 적용되므로, 위 SELECT 정책에 따라
-- 자신이 참여한 대화방의 메시지만 broadcast 받는다.
-- =====================================================================
