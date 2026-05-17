-- =====================================================================
-- supabase/policies/recommendation_reasons.sql
--
-- 추천 이유 RLS 정책.
--
-- 핵심 원칙:
-- 1. 자신이 받은 추천의 이유만 SELECT 가능.
-- 2. generatedBy ('rule' | 'ai' | 'admin') 컬럼은 사용자에게 노출 안 함
--    (CLAUDE.md 13장 — "운영자가 직접 골랐다" 인상을 주는 표현 금지).
-- 3. INSERT/UPDATE/DELETE 는 NestJS service role 만.
-- =====================================================================

ALTER TABLE recommendation_reasons ENABLE ROW LEVEL SECURITY;

-- 자신이 받은 추천의 이유 SELECT (recommendations 조인으로 검증)
DROP POLICY IF EXISTS "select_own_recommendation_reasons" ON recommendation_reasons;
CREATE POLICY "select_own_recommendation_reasons" ON recommendation_reasons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recommendations r
      WHERE r.id = recommendation_reasons.recommendation_id
        AND r.user_id = auth.uid()
    )
  );

-- generatedBy 컬럼 노출 제한
REVOKE SELECT ON recommendation_reasons FROM anon, authenticated;
GRANT SELECT (
  id,
  recommendation_id,
  summary_text,
  matched_points,
  difference_points,
  conversation_topics,
  curator_memo,
  created_at
) ON recommendation_reasons TO authenticated;

GRANT ALL ON recommendation_reasons TO service_role;
