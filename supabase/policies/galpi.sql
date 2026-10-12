-- =====================================================================
-- supabase/policies/galpi.sql
--
-- 갈피 AI 엔진 테이블 RLS (docs/superpowers/specs/2026-10-11-갈피-AI-엔진-design.md)
--
-- 핵심 원칙:
-- 1. 모바일은 이 테이블을 직접 읽지도 쓰지도 않는다. 전부 NestJS 경유 (데이터 흐름 패턴 2)
-- 2. 그래서 정책을 만들지 않고 RLS 만 켠다 → anon·authenticated 는 전부 거부, service role 만 접근
-- 3. 서고(wiki_claims)와 넘긴 이유는 AI 만 본다 (하드룰 2). 정책을 더하는 변경은 하드룰 검토를 거친다
-- =====================================================================

ALTER TABLE galpi_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE galpi_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_claim_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
