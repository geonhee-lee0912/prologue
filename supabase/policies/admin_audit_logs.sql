-- =====================================================================
-- supabase/policies/admin_audit_logs.sql
--
-- 운영자 감사 로그 RLS.
--
-- 운영자 도구(Next.js)는 NestJS Admin API 만 거친다. 클라이언트가 직접 읽지도 쓰지도 않는다.
-- 그래서 정책을 만들지 않고 RLS 만 켠다 → anon·authenticated 는 전부 거부, service role 만 접근.
-- =====================================================================

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
