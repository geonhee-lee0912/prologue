-- =====================================================================
-- supabase/policies/contact_exchanges.sql
--
-- 연락처 교환 RLS 정책 (FR-G05/G06).
--
-- 핵심 원칙:
-- 1. 양쪽 사용자만 SELECT 가능.
-- 2. 컬럼 단위 노출 제한: requesterContactMasked / responderContactMasked 는
--    NestJS service role 만 SELECT. 모바일은 메타데이터만.
--    (시스템 메시지 본문이 평문 노출 채널이고, 이 row 는 운영 보관용이라 분리.)
-- 3. INSERT/UPDATE/DELETE 는 NestJS service role 만 (트랜잭션 + 검증 필요).
-- =====================================================================

ALTER TABLE contact_exchanges ENABLE ROW LEVEL SECURITY;

-- 양쪽 사용자 SELECT
DROP POLICY IF EXISTS "select_own_contact_exchanges" ON contact_exchanges;
CREATE POLICY "select_own_contact_exchanges" ON contact_exchanges
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = responder_id);

-- 컬럼 단위 노출 제한: 마스킹 컬럼 두 개는 service role 만
REVOKE SELECT ON contact_exchanges FROM anon, authenticated;
GRANT SELECT (
  id,
  conversation_id,
  requester_id,
  responder_id,
  contact_type,
  status,
  requested_at,
  responded_at
) ON contact_exchanges TO authenticated;

GRANT ALL ON contact_exchanges TO service_role;
