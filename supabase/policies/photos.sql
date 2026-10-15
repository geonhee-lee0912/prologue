-- =====================================================================
-- supabase/policies/photos.sql
--
-- 사진 RLS 정책.
--
-- 핵심 원칙:
-- 1. 자신의 사진 SELECT 가능 (마이페이지/프로필 미리보기).
-- 2. 매칭된 상대의 사진만 SELECT 가능 (프로필 상세). 소개(introduction) 받은 상대의 사진은
--    소개 테이블이 생길 때 다시 설계한다 (옛 추천 테이블은 2026-09-17 정리로 없어졌다).
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

-- 옛 추천 정책 — 테이블이 없어졌다. 남아 있는 DB 에서도 지운다
DROP POLICY IF EXISTS "select_recommended_photos" ON photos;

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
