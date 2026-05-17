-- AddUniqueConstraint
-- FR-B01: 동일 CI 로 중복 가입 방지
CREATE UNIQUE INDEX "user_auths_identity_ci_hash_key" ON "user_auths"("identity_ci_hash");
