-- AlterTable: 카카오 로그인 지원 (FR-A02 간편 로그인)
ALTER TABLE "users" ADD COLUMN "kakao_id" TEXT;

-- AddUniqueConstraint
CREATE UNIQUE INDEX "users_kakao_id_key" ON "users"("kakao_id");
