-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'active', 'suspended', 'withdrawn');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('free', 'plus', 'trust_plus');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "LoginProvider" AS ENUM ('phone', 'kakao', 'apple');

-- CreateEnum
CREATE TYPE "FaceMatchStatus" AS ENUM ('not_submitted', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "EmploymentVerificationStatus" AS ENUM ('not_submitted', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ProfileAnswerCategory" AS ENUM ('story', 'relationship');

-- CreateEnum
CREATE TYPE "RelationshipIntent" AS ENUM ('serious_long_term', 'natural_dating', 'open_to_marriage', 'casual_meeting', 'friendship_first');

-- CreateEnum
CREATE TYPE "RelationshipPace" AS ENUM ('slow', 'moderate', 'fast');

-- CreateEnum
CREATE TYPE "ContactFrequency" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('main', 'daily', 'hobby');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('created', 'shown', 'interested', 'skipped', 'expired');

-- CreateEnum
CREATE TYPE "RecommendationGeneratedBy" AS ENUM ('rule', 'ai', 'admin');

-- CreateEnum
CREATE TYPE "UserActionType" AS ENUM ('view_card', 'view_profile', 'view_report', 'send_interest', 'skip', 'block_request', 'report_request');

-- CreateEnum
CREATE TYPE "SkipReason" AS ENUM ('appearance_low_match', 'intent_mismatch', 'distance_mismatch', 'conversation_style_mismatch', 'job_lifestyle_mismatch', 'values_mismatch', 'insufficient_profile', 'other');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('active', 'expired', 'blocked', 'reported');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'expired', 'closed', 'blocked');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'system_topic', 'system_extension', 'system_contact', 'system_safety', 'system_expiry');

-- CreateEnum
CREATE TYPE "ContactExchangeStatus" AS ENUM ('requested', 'accepted', 'declined', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('phone', 'kakao');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('rude_message', 'sexual_content', 'harassment', 'fake_information', 'in_relationship', 'scam_or_money_request', 'external_contact_pressure', 'other');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewing', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentProductType" AS ENUM ('plus_subscription', 'extra_recommendation');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'manager', 'reviewer');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "AdminReviewTargetType" AS ENUM ('profile', 'photo', 'employment_auth', 'report', 'recommendation');

-- CreateEnum
CREATE TYPE "AdminReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "email" TEXT,
    "login_provider" "LoginProvider" NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_year" INTEGER NOT NULL,
    "target_gender" "Gender" NOT NULL,
    "region1" TEXT NOT NULL,
    "region2" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "membership_type" "MembershipType" NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "withdrawn_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "replaced_by_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "consent_type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "agreed" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "agreed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_auths" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "identity_verified_at" TIMESTAMP(3),
    "identity_ci_hash" TEXT,
    "identity_provider" TEXT,
    "face_match_status" "FaceMatchStatus" NOT NULL DEFAULT 'not_submitted',
    "face_verified_at" TIMESTAMP(3),
    "face_confidence" DOUBLE PRECISION,
    "age_verified" BOOLEAN NOT NULL DEFAULT false,
    "manner_pledge_agreed" BOOLEAN NOT NULL DEFAULT false,
    "manner_pledge_agreed_at" TIMESTAMP(3),
    "single_pledge_agreed" BOOLEAN NOT NULL DEFAULT false,
    "single_pledge_agreed_at" TIMESTAMP(3),
    "employment_verification_status" "EmploymentVerificationStatus" NOT NULL DEFAULT 'not_submitted',
    "employment_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_auths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "job_category" TEXT,
    "intro" TEXT,
    "lifestyle_tags" TEXT[],
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "completion_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_answers" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "ProfileAnswerCategory" NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_preferences" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "intent" "RelationshipIntent" NOT NULL,
    "pace" "RelationshipPace" NOT NULL,
    "contact_frequency" "ContactFrequency" NOT NULL,
    "extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationship_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "photo_type" "PhotoType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "face_match_status" "FaceMatchStatus" NOT NULL DEFAULT 'not_submitted',
    "moderation_flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "recommendation_date" DATE NOT NULL,
    "batch_id" TEXT,
    "rank" INTEGER NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "trust_score" DOUBLE PRECISION,
    "relationship_score" DOUBLE PRECISION,
    "lifestyle_score" DOUBLE PRECISION,
    "conversation_score" DOUBLE PRECISION,
    "distance_score" DOUBLE PRECISION,
    "profile_quality_score" DOUBLE PRECISION,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'created',
    "shown_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_reasons" (
    "id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "summary_text" TEXT NOT NULL,
    "matched_points" TEXT[],
    "difference_points" TEXT[],
    "conversation_topics" TEXT[],
    "curator_memo" TEXT NOT NULL,
    "generated_by" "RecommendationGeneratedBy" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_actions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "recommendation_id" TEXT,
    "action_type" "UserActionType" NOT NULL,
    "skip_reason" "SkipReason",
    "skip_reason_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "matched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MatchStatus" NOT NULL DEFAULT 'active',
    "ended_at" TIMESTAMP(3),
    "end_reason" TEXT,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "extensions_used" INTEGER NOT NULL DEFAULT 0,
    "ended_at" TIMESTAMP(3),
    "end_reason" TEXT,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" UUID,
    "message_type" "MessageType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_exchanges" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "requester_id" UUID NOT NULL,
    "responder_id" UUID NOT NULL,
    "contact_type" "ContactType" NOT NULL,
    "status" "ContactExchangeStatus" NOT NULL DEFAULT 'requested',
    "requester_contact_masked" TEXT,
    "responder_contact_masked" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "contact_exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "conversation_id" TEXT,
    "message_id" TEXT,
    "report_type" "ReportType" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "product_type" "PaymentProductType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "provider_tx_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "succeeded_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "status" "AdminStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_reviews" (
    "id" TEXT NOT NULL,
    "target_type" "AdminReviewTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reviewer_id" TEXT,
    "status" "AdminReviewStatus" NOT NULL DEFAULT 'pending',
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "admin_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_hash_key" ON "users"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_gender_target_gender_idx" ON "users"("status", "gender", "target_gender");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "user_consents_user_id_consent_type_idx" ON "user_consents"("user_id", "consent_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_auths_user_id_key" ON "user_auths"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profile_answers_user_id_idx" ON "profile_answers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_answers_user_id_question_key_key" ON "profile_answers"("user_id", "question_key");

-- CreateIndex
CREATE UNIQUE INDEX "relationship_preferences_user_id_key" ON "relationship_preferences"("user_id");

-- CreateIndex
CREATE INDEX "photos_user_id_idx" ON "photos"("user_id");

-- CreateIndex
CREATE INDEX "recommendations_user_id_status_recommendation_date_idx" ON "recommendations"("user_id", "status", "recommendation_date");

-- CreateIndex
CREATE INDEX "recommendations_batch_id_idx" ON "recommendations"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "recommendations_user_id_target_user_id_recommendation_date_key" ON "recommendations"("user_id", "target_user_id", "recommendation_date");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_reasons_recommendation_id_key" ON "recommendation_reasons"("recommendation_id");

-- CreateIndex
CREATE INDEX "user_actions_user_id_action_type_created_at_idx" ON "user_actions"("user_id", "action_type", "created_at");

-- CreateIndex
CREATE INDEX "user_actions_target_user_id_action_type_idx" ON "user_actions"("target_user_id", "action_type");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "matches_user_a_id_user_b_id_key" ON "matches"("user_a_id", "user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_match_id_key" ON "conversations"("match_id");

-- CreateIndex
CREATE INDEX "conversations_user_a_id_status_idx" ON "conversations"("user_a_id", "status");

-- CreateIndex
CREATE INDEX "conversations_user_b_id_status_idx" ON "conversations"("user_b_id", "status");

-- CreateIndex
CREATE INDEX "conversations_expires_at_idx" ON "conversations"("expires_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_exchanges_conversation_id_idx" ON "contact_exchanges"("conversation_id");

-- CreateIndex
CREATE INDEX "reports_target_user_id_status_idx" ON "reports"("target_user_id", "status");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_tx_id_key" ON "payments"("provider_tx_id");

-- CreateIndex
CREATE INDEX "payments_user_id_status_idx" ON "payments"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_reviews_target_type_status_idx" ON "admin_reviews"("target_type", "status");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_created_at_idx" ON "admin_audit_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_created_at_idx" ON "admin_audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auths" ADD CONSTRAINT "user_auths_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_answers" ADD CONSTRAINT "profile_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_preferences" ADD CONSTRAINT "relationship_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_reasons" ADD CONSTRAINT "recommendation_reasons_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_actions" ADD CONSTRAINT "user_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_actions" ADD CONSTRAINT "user_actions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_exchanges" ADD CONSTRAINT "contact_exchanges_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_exchanges" ADD CONSTRAINT "contact_exchanges_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_exchanges" ADD CONSTRAINT "contact_exchanges_responder_id_fkey" FOREIGN KEY ("responder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_reviews" ADD CONSTRAINT "admin_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
