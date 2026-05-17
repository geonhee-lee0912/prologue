-- =====================================================================
-- supabase/policies/reports.sql
--
-- 신고 RLS 정책 (FR-H01).
--
-- 핵심 원칙:
-- 1. 신고 내용(description), 운영 메모(resolution_note), 신고 대상의 신원은
--    어떤 사용자에게도 노출 금지 (CLAUDE.md 10.2).
--    → 모바일에서 직접 SELECT 자체를 막는다.
-- 2. INSERT 는 NestJS service role 만 (검증 후 생성).
-- 3. 사용자가 자기 신고 이력을 보고 싶어도 MVP 에서는 미노출 (혼란 방지).
--    필요 시 별도 view + 마스킹된 컬럼만으로 추후 제공.
-- =====================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 어떤 사용자 SELECT 도 허용하지 않음. RLS 기본은 deny.
-- (anon / authenticated 정책 없음 = 접근 불가)

-- 모바일 클라이언트의 직접 INSERT/UPDATE/DELETE 도 차단.
REVOKE ALL ON reports FROM anon, authenticated;

-- NestJS 서비스만 모든 작업 가능 (RLS 우회).
GRANT ALL ON reports TO service_role;
