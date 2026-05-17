-- =====================================================================
-- supabase/policies/photos.sql
--
-- 사진 RLS 정책.
--
-- 핵심 원칙:
-- 1. 자신의 사진 SELECT 가능 (마이페이지/프로필 미리보기).
-- 2. 자신에게 추천된 상대 또는 매칭된 상대의 사진만 SELECT 가능 (프로필 상세).
-- 3. 무관한 다른 사용자 사진 SELECT 불가.
-- 4. INSERT/UPDATE/DELETE 는 NestJS service role 만 (업로드는 백엔드 경유).
-- 5. soft deleted (deleted_at IS NOT NULL) 사진은 노출 안 함.
--
-- Storage 객체 자체는 NestJS 가 signed URL 을 발급해 접근 — 별도 storage.objects RLS 는 미적용.
-- =====================================================================

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 자신의 사진 SELECT
DROP POLICY IF EXISTS "select_own_photos" ON photos;
CREATE POLICY "select_own_photos" ON photos
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- 추천된 상대의 사진 SELECT
DROP POLICY IF EXISTS "select_recommended_photos" ON photos;
CREATE POLICY "select_recommended_photos" ON photos
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM recommendations r
      WHERE r.user_id = auth.uid()
        AND r.target_user_id = photos.user_id
        AND r.status IN ('created', 'shown', 'interested', 'skipped')
    )
  );

-- 매칭된 상대의 사진 SELECT
DROP POLICY IF EXISTS "select_matched_photos" ON photos;
CREATE POLICY "select_matched_photos" ON photos
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.status = 'active'
        AND (
          (m.user_a_id = auth.uid() AND m.user_b_id = photos.user_id)
          OR (m.user_b_id = auth.uid() AND m.user_a_id = photos.user_id)
        )
    )
  );

-- INSERT/UPDATE/DELETE 정책 없음 → service role 만 가능
