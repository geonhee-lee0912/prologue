import { Module } from '@nestjs/common';
import { GalpiAccessService } from './access.service';
import { ConversationService } from './conversation.service';
import { GalpiController } from './galpi.controller';
import { GalpiScheduler } from './galpi.scheduler';
import { KnownService } from './known.service';
import { ProactiveService } from './proactive/proactive.service';
import { PushTokenController } from './push-token.controller';
import { PushTokenService } from './push-token.service';
import { QuickReplyService } from './quick-reply.service';
import { ReportService } from './report/report.service';
import { IngestService } from './wiki/ingest.service';
import { WikiService } from './wiki/wiki.service';

/**
 * 갈피 AI 엔진 1단계 — docs/superpowers/specs/2026-10-11-갈피-AI-엔진-design.md
 * PrismaService(PrismaModule)와 LLM_PROVIDER·PUSH_PROVIDER(InfraModule)는 전역 모듈에서 온다
 */
@Module({
  controllers: [GalpiController, PushTokenController],
  providers: [
    GalpiAccessService,
    WikiService,
    ReportService,
    KnownService,
    IngestService,
    ConversationService,
    QuickReplyService,
    ProactiveService,
    PushTokenService,
    GalpiScheduler,
  ],
})
export class GalpiModule {}
