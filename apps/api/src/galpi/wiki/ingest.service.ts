import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GalpiMessage } from '@prisma/client';
import { LLM_PROVIDER, type LlmProvider, POLICY, pseudonymize, type WikiPageKey } from '@prologue/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { GalpiAccessService } from '../access.service';
import { KnownService } from '../known.service';
import { kstDateKey } from '../time';
import { parseIngest } from './ingest';
import { buildIngestMessages } from './ingest.prompt';

/** 한 번에 정리하는 메시지 수. 넘치면 다음 수집이 이어서 한다 */
const BATCH_LIMIT = 40;

/**
 * 서고 수집 — 대화가 한 덩이 끝날 때 돈다 (AI 엔진 문서 3.5)
 * 말이 LLM(국외)으로 가므로 갈피와 이야기할 수 있는 사람만 정리한다 — 동의를 철회했거나 정지·탈퇴한 사람은 건너뛴다 (CLAUDE.md 10.2c)
 */
@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  /** 이 서버에서 수집이 돌고 있는 사용자 — 같은 사람을 겹쳐 돌리지 않는다(서버끼리는 묶음 차지로 막는다) */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly known: KnownService,
    private readonly access: GalpiAccessService,
  ) {}

  /** 새 대화를 서고에 정리한다. 새 사용자 말이 없거나 동의가 없으면 LLM 을 부르지 않는다 */
  async runForUser(userId: string, now = new Date()): Promise<void> {
    await this.run(userId, now);
  }

  /** 대화가 멈춘 사람을 모아 정리한다. 알게 된 사람은 한국 날짜로 하루 한 번까지. 실제로 정리한 사람 수를 돌려준다 */
  async sweep(now = new Date()): Promise<number> {
    const idleBefore = new Date(now.getTime() - POLICY.galpi.ingest.idleMinutes * 60_000);
    const states = await this.prisma.galpiState.findMany({ where: { lastUserMessageAt: { lt: idleBefore } } });
    let ran = 0;
    for (const state of states) {
      if (!state.lastUserMessageAt) continue;
      if (state.lastIngestAt && state.lastIngestAt >= state.lastUserMessageAt) continue;
      if (state.knownAt && state.lastIngestAt && kstDateKey(state.lastIngestAt) === kstDateKey(now)) continue;
      try {
        if (await this.run(state.userId, now)) ran += 1;
      } catch {
        this.logger.warn(`sweep ingest failed user=${state.userId}`);
      }
    }
    return ran;
  }

  /** 수집이 실제로 돈 사람이면 true. 건너뛴 사람(겹침·동의 없음·새 말 없음·다른 곳이 차지함)은 false */
  private async run(userId: string, now: Date): Promise<boolean> {
    if (this.running.has(userId)) return false;
    this.running.add(userId);
    try {
      return await this.runLocked(userId, now);
    } finally {
      this.running.delete(userId);
    }
  }

  private async runLocked(userId: string, now: Date): Promise<boolean> {
    // 묶음을 차지하기 전, LLM 을 부르기 전에 갈피와 이야기할 수 있는 사람인지 본다
    if (!(await this.mayIngest(userId))) return false;

    const state = await this.prisma.galpiState.findUnique({ where: { userId } });
    if (!state) return false;
    const batch = await this.prisma.galpiMessage.findMany({
      where: { userId, kind: 'text', safety: false, ...(state.lastIngestAt ? { createdAt: { gt: state.lastIngestAt } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: BATCH_LIMIT,
    });
    const userMessages = batch.filter((m) => m.sender === 'user' && !m.skipped);
    if (userMessages.length === 0) return false;

    // 이 묶음을 먼저 차지한다 — 같은 대화를 두 곳에서 정리하지 않게 (리뷰 4)
    const batchEnd = batch[batch.length - 1].createdAt;
    const claimed = await this.prisma.galpiState.updateMany({
      where: { userId, lastIngestAt: state.lastIngestAt },
      data: { lastIngestAt: batchEnd },
    });
    if (claimed.count === 0) return false;

    try {
      await this.ingestBatch(userId, batch, userMessages);
    } catch (error) {
      await this.prisma.galpiState.updateMany({ where: { userId, lastIngestAt: batchEnd }, data: { lastIngestAt: state.lastIngestAt } });
      this.logger.warn(`ingest failed user=${userId}`);
      throw error;
    }

    // 정리는 이미 커밋됐다 — 알게 됨 확인(첫 리포트 편지를 쓰는 LLM 호출 등)이 실패해도 정리를 실패로 만들지 않는다.
    // knownAt 이 그대로 null 이라 다음 수집 때 다시 본다
    try {
      await this.known.checkAndMarkKnown(userId, now);
    } catch {
      this.logger.warn(`known check failed user=${userId}`);
    }
    return true;
  }

  /** 동의를 철회했거나 정지·탈퇴한 사람(AppException)은 조용히 건너뛴다. 확인이 오류로 실패해도 말을 LLM 으로 보내지 않는다 */
  private async mayIngest(userId: string): Promise<boolean> {
    try {
      await this.access.assertCanTalk(userId);
      return true;
    } catch (error) {
      if (error instanceof AppException) this.logger.debug(`ingest skipped user=${userId}`);
      else this.logger.warn(`ingest access check failed user=${userId}`);
      return false;
    }
  }

  private async ingestBatch(userId: string, batch: GalpiMessage[], userMessages: GalpiMessage[]): Promise<void> {
    const [claims, facts, user] = await Promise.all([
      this.prisma.wikiClaim.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true, page: true, text: true } }),
      this.prisma.profileFact.findMany({ where: { userId }, select: { key: true, value: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { profile: { select: { displayName: true } } } }),
    ]);
    const name = user?.profile?.displayName ?? null;
    const messages = buildIngestMessages({
      claims: claims.map((c) => ({ id: c.id, page: c.page, text: c.text })),
      facts: facts.map((f) => ({ key: f.key, value: f.value })),
      batch: batch
        .filter((m) => !m.skipped)
        .map((m) => ({ id: m.id, sender: m.sender, text: m.sender === 'user' ? pseudonymize(m.content, { name }) : m.content })),
    });
    const result = await this.llm.complete({ purpose: 'ingest', userId, messages, responseFormat: 'json', maxOutputTokens: 1200 });
    const ops = parseIngest(result.content, {
      batchUserMessageIds: new Set(userMessages.map((m) => m.id)),
      existingClaims: new Map(claims.map((c) => [c.id, c.page as WikiPageKey])),
      maxClaimsPerPage: POLICY.galpi.ingest.maxClaimsPerPage,
    });

    await this.prisma.$transaction(async (tx) => {
      for (const id of ops.removes) await tx.wikiClaim.deleteMany({ where: { id, userId } });
      for (const update of ops.updates) {
        await tx.wikiClaim.update({
          where: { id: update.id },
          data: {
            text: update.text,
            ...(update.sources.length ? { sources: { create: update.sources.map((messageId) => ({ messageId })) } } : {}),
          },
        });
      }
      for (const add of ops.adds) {
        await tx.wikiClaim.create({
          data: { userId, page: add.page, text: add.text, sources: { create: add.sources.map((messageId) => ({ messageId })) } },
        });
      }
      for (const fact of ops.facts) {
        await tx.profileFact.upsert({
          where: { userId_key: { userId, key: fact.key } },
          create: { userId, key: fact.key, value: fact.value },
          update: { value: fact.value },
        });
      }
      await tx.galpiState.update({ where: { userId }, data: { turnsSinceIngest: 0 } });
    });
    this.logger.log(
      `ingest user=${userId} add=${ops.adds.length} update=${ops.updates.length} remove=${ops.removes.length} facts=${ops.facts.length}`,
    );
  }
}
