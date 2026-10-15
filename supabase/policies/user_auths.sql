-- =====================================================================
-- supabase/policies/user_auths.sql
--
-- 로그인 수단과 본인인증 해시 RLS.
--
-- 모바일·관리자 앱은 이 테이블을 직접 읽지도 쓰지도 않는다. 전부 NestJS 경유 (데이터 흐름 패턴 2).
-- 그래서 정책을 만들지 않고 RLS 만 켠다 → anon·authenticated 는 전부 거부, service role 만 접근.
-- =====================================================================

ALTER TABLE user_auths ENABLE ROW LEVEL SECURITY;
