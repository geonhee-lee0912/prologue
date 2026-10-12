-- CreateEnum
CREATE TYPE "GalpiSpeechLevel" AS ENUM ('mixed', 'casual');

-- CreateEnum
CREATE TYPE "GalpiSender" AS ENUM ('galpi', 'user');

-- CreateEnum
CREATE TYPE "GalpiMessageKind" AS ENUM ('text', 'emoticon');

-- CreateEnum
CREATE TYPE "WikiPage" AS ENUM ('now', 'people', 'relationship', 'met', 'attraction', 'next_topics');

-- CreateEnum
CREATE TYPE "ProfileFactKey" AS ENUM ('school', 'income_band', 'housing', 'company', 'smoking', 'marriage_intent', 'children_intent');

-- CreateEnum
CREATE TYPE "LlmPurpose" AS ENUM ('reply', 'ingest', 'report', 'proactive', 'eval');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "display_name" TEXT;

-- CreateTable
CREATE TABLE "galpi_states" (
    "user_id" UUID NOT NULL,
    "first_meeting_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_turns" INTEGER NOT NULL DEFAULT 0,
    "turns_since_ingest" INTEGER NOT NULL DEFAULT 0,
    "known_at" TIMESTAMP(3),
    "speech_level" "GalpiSpeechLevel" NOT NULL DEFAULT 'mixed',
    "casual_offered_at" TIMESTAMP(3),
    "last_user_message_at" TIMESTAMP(3),
    "last_proactive_at" TIMESTAMP(3),
    "unanswered_proactive" INTEGER NOT NULL DEFAULT 0,
    "last_ingest_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galpi_states_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "galpi_messages" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "sender" "GalpiSender" NOT NULL,
    "kind" "GalpiMessageKind" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "expression" TEXT,
    "quick_reply" JSONB,
    "answered_key" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "proactive" BOOLEAN NOT NULL DEFAULT false,
    "safety" BOOLEAN NOT NULL DEFAULT false,
    "sensitive_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "galpi_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_claims" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "page" "WikiPage" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wiki_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wiki_claim_sources" (
    "claim_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,

    CONSTRAINT "wiki_claim_sources_pkey" PRIMARY KEY ("claim_id","message_id")
);

-- CreateTable
CREATE TABLE "profile_facts" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "key" "ProfileFactKey" NOT NULL,
    "value" TEXT,
    "letter_allowed" BOOLEAN,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_reports" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "self_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usages" (
    "id" TEXT NOT NULL,
    "user_id" UUID,
    "purpose" "LlmPurpose" NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "galpi_states_last_user_message_at_idx" ON "galpi_states"("last_user_message_at");

-- CreateIndex
CREATE INDEX "galpi_messages_user_id_created_at_idx" ON "galpi_messages"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wiki_claims_user_id_page_idx" ON "wiki_claims"("user_id", "page");

-- CreateIndex
CREATE INDEX "wiki_claim_sources_message_id_idx" ON "wiki_claim_sources"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_facts_user_id_key_key" ON "profile_facts"("user_id", "key");

-- CreateIndex
CREATE INDEX "self_reports_user_id_created_at_idx" ON "self_reports"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "llm_usages_user_id_created_at_idx" ON "llm_usages"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "push_tokens_token_idx" ON "push_tokens"("token");

-- AddForeignKey
ALTER TABLE "galpi_states" ADD CONSTRAINT "galpi_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galpi_messages" ADD CONSTRAINT "galpi_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_claims" ADD CONSTRAINT "wiki_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_claim_sources" ADD CONSTRAINT "wiki_claim_sources_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "wiki_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_claim_sources" ADD CONSTRAINT "wiki_claim_sources_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "galpi_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_facts" ADD CONSTRAINT "profile_facts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_reports" ADD CONSTRAINT "self_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

