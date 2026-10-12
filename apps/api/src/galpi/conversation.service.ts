import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import type { GalpiMessage, GalpiState } from '@prisma/client';
import {
  ErrorCode,
  GALPI_COPY,
  GALPI_SKIP_TEXT,
  type GalpiTurnResultDto,
  LLM_PROVIDER,
  type LlmProvider,
  POLICY,
  type QuickReplySpec,
  scrubForStorage,
} from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { GalpiAccessService } from './access.service';
import { shouldOfferCasual } from './casual-offer';
import { type GalpiLine, loadRenderContext, saveGalpiLine, stripUnstorableChars, toMessageDto } from './messages';
import { buildReplyMessages, type ReplyPromptInput } from './prompt/reply-prompt';
import type { ParsedReply } from './reply';
import { completeReply, loadReplyInput } from './reply-llm';
import { type CrisisKind, detectCrisis, safetyMessage } from './safety/crisis';
import { truncateCodePoints } from './text';
import { IngestService } from './wiki/ingest.service';
import { WikiService, type WikiSnapshot } from './wiki/wiki.service';

/** 대화 기록 한 쪽의 기본 개수와 상한 */
const HISTORY_PAGE_DEFAULT = 50;
const HISTORY_PAGE_MAX = 100;

/**
 * LLM 이 실패하거나 쓸 수 없는 답을 두 번 냈을 때의 대체 답 (리뷰 1).
 * 버려진 답이 알린 위기 신호(crisis)는 그대로 실어, 대체 문장 뒤에도 안전 안내가 붙게 한다
 */
function fallbackReply(crisis: CrisisKind): ParsedReply {
  return {
    bubbles: [{ text: GALPI_COPY.fallback, expression: 'thinking' }],
    quickReply: null,
    signals: { userUsedCasual: false, crisis },
  };
}

/** 갈피와 말 주고받기 — 첫 만남, 알아가기, 매일 대화 (AI 엔진 문서 5장) */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    private readonly access: GalpiAccessService,
    private readonly wiki: WikiService,
    private readonly ingest: IngestService,
  ) {}

  /** 첫 만남 — 처음 한 번만 고정 대사를 놓는다. 두 번 불러도 같은 기록을 돌려준다 (리뷰 2) */
  async start(userId: string, now = new Date()): Promise<GalpiTurnResultDto> {
    await this.access.assertCanTalk(userId);
    if (!(await this.prisma.galpiState.findUnique({ where: { userId } }))) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.galpiState.create({ data: { userId, firstMeetingAt: now } });
          await saveGalpiLine(tx, userId, { kind: 'emoticon', content: 'wave', expression: 'wave' }, now);
          for (const [i, text] of GALPI_COPY.firstMeeting.entries()) {
            await saveGalpiLine(tx, userId, { content: text }, new Date(now.getTime() + i + 1));
          }
        });
      } catch (error) {
        // 동시에 두 번 불리면 GalpiState 의 기본 키가 한쪽만 통과시킨다
        if (!(await this.prisma.galpiState.findUnique({ where: { userId } }))) throw error;
      }
    }
    return this.load(userId, {});
  }

  /** 대화 기록 — 동의를 철회해도 볼 수 있다 */
  async history(userId: string, opts: { before?: string; limit?: number }): Promise<GalpiTurnResultDto> {
    await this.access.assertVerified(userId);
    return this.load(userId, opts);
  }

  /**
   * 말하기 — 응답의 messages 는 [내 말, ...갈피 말].
   * 내 말은 갈피에게 묻기 전에 정리해서 저장한다. 그 뒤 LLM 이 실패하거나 읽을 수 없는 답을 줘도 내 말은 남고 갈피는 대체 문장으로 답한다 (리뷰 1).
   * 위기 신호(낱말 규칙)면 LLM 을 부르지 않고 안전 안내만 한다
   */
  async send(userId: string, input: { text: string; skipped?: boolean }, now = new Date()): Promise<GalpiTurnResultDto> {
    await this.access.assertCanTalk(userId);
    const state = await this.prisma.galpiState.findUnique({ where: { userId } });
    if (!state) throw new AppException(ErrorCode.GALPI_NOT_STARTED, '갈피와 첫인사를 먼저 나눠 주세요.', HttpStatus.CONFLICT);

    const skipped = input.skipped === true;
    // 짝 없는 서로게이트·널 문자는 저장이 거절돼 500 이 날 수 있으니 먼저 뺀다(뺀 뒤에 다듬어야 가려져 있던 공백도 걷힌다).
    // 글자 수 한도는 코드 포인트로 자른다 — UTF-16 칸으로 자르면 이모지를 반으로 갈라 깨진 글자가 남는다
    const raw = skipped
      ? GALPI_SKIP_TEXT
      : truncateCodePoints(stripUnstorableChars(input.text ?? '').trim(), POLICY.galpi.maxUserMessageLength);
    if (!raw) throw new AppException(ErrorCode.VALIDATION_ERROR, '할 말을 적어 주세요.', HttpStatus.BAD_REQUEST);

    const crisis = skipped ? 'none' : detectCrisis(raw);
    const scrubbed = scrubForStorage(raw);
    const sensitiveJustNow = scrubbed.categories.length > 0;
    const userMessage = await this.prisma.galpiMessage.create({
      data: { userId, sender: 'user', kind: 'text', content: scrubbed.text, skipped, sensitiveCategories: scrubbed.categories, createdAt: now },
    });
    const updated = await this.prisma.galpiState.update({
      where: { userId },
      data: {
        lastUserMessageAt: now,
        unansweredProactive: 0,
        ...(skipped ? {} : { userTurns: { increment: 1 }, turnsSinceIngest: { increment: 1 } }),
      },
    });

    const ctx = await loadRenderContext(this.prisma, userId);
    const replies: GalpiMessage[] = [];
    let at = now.getTime();
    const say = async (line: GalpiLine) => {
      at += 1;
      replies.push(await saveGalpiLine(this.prisma, userId, line, new Date(at)));
    };

    if (crisis !== 'none') {
      await say({ content: safetyMessage(crisis), safety: true });
      return { messages: [userMessage, ...replies].map((m) => toMessageDto(m, ctx)) };
    }

    const reply = await this.generateReply(userId, updated, ctx.displayName, { sensitiveJustNow, skipped });
    const llmCrisis = reply.signals.crisis;
    const quickReply = llmCrisis === 'none' ? reply.quickReply : null;
    for (const [i, bubble] of reply.bubbles.entries()) {
      const isLast = i === reply.bubbles.length - 1;
      await say({ content: bubble.text, expression: bubble.expression, quickReply: isLast ? quickReply : null });
    }
    if (llmCrisis !== 'none') await say({ content: safetyMessage(llmCrisis), safety: true });

    if (
      shouldOfferCasual({
        speechLevel: updated.speechLevel,
        casualOfferedAt: updated.casualOfferedAt,
        knownAt: updated.knownAt,
        userUsedCasual: reply.signals.userUsedCasual,
        sensitiveJustNow,
        crisis: llmCrisis !== 'none',
        skipped,
        now,
      })
    ) {
      // 한 번만 — 두 요청이 겹쳐 둘 다 아직 안 꺼냈다고 봐도, 먼저 차지한 쪽만 말을 놓자고 한다 (리뷰 2)
      const claimed = await this.prisma.galpiState.updateMany({ where: { userId, casualOfferedAt: null }, data: { casualOfferedAt: now } });
      if (claimed.count > 0) await say({ content: GALPI_COPY.speechOffer, quickReply: { type: 'speech_level' } });
    }

    if (!updated.knownAt && updated.turnsSinceIngest >= POLICY.galpi.ingest.userTurnsPerChunk) {
      void this.ingest.runForUser(userId).catch(() => this.logger.warn(`inline ingest failed user=${userId}`));
    }
    return { messages: [userMessage, ...replies].map((m) => toMessageDto(m, ctx)) };
  }

  private async load(userId: string, opts: { before?: string; limit?: number }): Promise<GalpiTurnResultDto> {
    // 1~100 의 정수만 받는다. 0·음수·소수·NaN 은 기본값 — 음수 take 는 거꾸로 읽고 NaN 은 질의가 거절돼 500 이 된다
    const limit =
      opts.limit !== undefined && Number.isInteger(opts.limit) && opts.limit > 0 ? Math.min(opts.limit, HISTORY_PAGE_MAX) : HISTORY_PAGE_DEFAULT;
    let beforeAt: Date | undefined;
    if (opts.before) {
      const anchor = await this.prisma.galpiMessage.findFirst({ where: { id: opts.before, userId } });
      // 없는 자리(지워졌거나 남의 것)는 그 앞에 볼 것이 없다는 뜻이다. before 를 무시하고 가장 최근 쪽을 주면 앞쪽을 보던 화면에 같은 말이 또 붙는다
      if (!anchor) return { messages: [] };
      beforeAt = anchor.createdAt;
    }
    const rows = await this.prisma.galpiMessage.findMany({
      where: { userId, ...(beforeAt ? { createdAt: { lt: beforeAt } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const ctx = await loadRenderContext(this.prisma, userId);
    return { messages: rows.reverse().map((m) => toMessageDto(m, ctx)) };
  }

  private async generateReply(
    userId: string,
    state: GalpiState,
    displayName: string | null,
    flags: ReplyPromptInput['flags'],
  ): Promise<ParsedReply> {
    const { input, snapshot } = await loadReplyInput({ prisma: this.prisma, wiki: this.wiki }, userId, state, displayName, flags);
    const { reply, crisis } = await completeReply(this.llm, { userId, purpose: 'reply', messages: buildReplyMessages(input) });
    if (!reply) return fallbackReply(crisis);
    return { ...reply, quickReply: validQuickReply(reply.quickReply, snapshot) };
  }
}

/** 이미 답한 칸에 대한 버튼은 버린다 */
function validQuickReply(spec: QuickReplySpec | null, snapshot: WikiSnapshot): QuickReplySpec | null {
  if (!spec?.fact) return null;
  const fact = snapshot.facts[spec.fact];
  if (spec.type === 'condition_permission') return fact?.letterAllowed == null ? spec : null;
  if (spec.type === 'practical') return fact?.value ? null : spec;
  return null;
}
