-- =====================================================================
-- supabase/policies/users.sql
--
-- 사용자 계정 RLS.
--
-- 모바일·관리자 앱은 이 테이블을 직접 읽지도 쓰지도 않는다. 전부 NestJS 경유 (데이터 흐름 패턴 2).
-- 그래서 정책을 만들지 않고 RLS 만 켠다 → anon·authenticated 는 전부 거부, service role 만 접근.
-- =====================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
