import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GalpiMessage, GalpiState } from '@prisma/client';
import { LLM_PROVIDER, type LlmProvider, POLICY, PUSH_PROVIDER, type PushProvider } from '@prologue/shared';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { GalpiAccessService } from '../access.service';
import { loadRenderContext, saveGalpiLine, toMessageDto } from '../messages';
import { buildProactiveMessages } from '../prompt/proactive-prompt';
import type { ReplyBubble } from '../reply';
import { completeReply, loadReplyInput } from '../reply-llm';
import type { CrisisKind } from '../safety/crisis';
import { truncateCodePoints } from '../text';
import { isQuietHour } from '../time';
import { WikiService } from '../wiki/wiki.service';
import { findProactiveBanned, preferredHour, shouldSendProactive } from './proactive';

/** 주로 대화하던 시각을 볼 최근 사용자 말 수 */
const RECENT_FOR_HOUR = 30;
/** 잠금화면 알림 본문 길이 (글자 수) */
const PUSH_BODY_MAX = 80;

/** 갈피가 먼저 말 걸기 — 매시 정각에 돈다 (AI 엔진 문서 7장, galpi.scheduler.ts) */
@Injectable()
export class ProactiveService {
  private readonly logger = new Logger(ProactiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
    private readonly access: GalpiAccessService,
    private readonly wiki: WikiService,
  ) {}

  /** 보낸 수를 돌려준다. 서버 두 대가 같은 시각에 돌아도 한 사람에게 한 번만 간다 (리뷰 4) */
  async runOnce(now = new Date()): Promise<number> {
    if (isQuietHour(now)) return 0;
    const states = await this.prisma.galpiState.findMany({
      where: { unansweredProactive: { lt: POLICY.galpi.maxUnansweredProactive } },
    });
    let sent = 0;
    for (const state of states) {
      try {
        if (await this.sendTo(state, now)) sent += 1;
      } catch {
        // 오류 내용은 남기지 않는다 — 사용자 말이 담길 수 있다 (CLAUDE.md 10.3)
        this.logger.warn(`proactive failed user=${state.userId}`);
      }
    }
    return sent;
  }

  private async sendTo(state: GalpiState, now: Date): Promise<boolean> {
    const userId = state.userId;
    // 시각만 쓴다 — 말 본문은 읽지 않는다
    const [recent, lastSafety] = await Promise.all([
      this.prisma.galpiMessage.findMany({
        where: { userId, sender: 'user', skipped: false },
        orderBy: { createdAt: 'desc' },
        take: RECENT_FOR_HOUR,
        select: { createdAt: true },
      }),
      this.prisma.galpiMessage.findFirst({ where: { userId, safety: true }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);
    const due = shouldSendProactive({
      now,
      firstMeetingAt: state.firstMeetingAt,
      lastUserMessageAt: state.lastUserMessageAt,
      lastProactiveAt: state.lastProactiveAt,
      unansweredProactive: state.unansweredProactive,
      lastSafetyAt: lastSafety?.createdAt ?? null,
      preferredHour: preferredHour(recent.map((m) => m.createdAt)),
    });
    if (!due) return false;
    try {
      // 동의를 철회했거나 이용이 막힌 사람(AppException)에게는 조용히 걸지 않는다 — 말이 LLM 으로 간다.
      // 확인이 오류로 실패해도 걸지 않는다. 오류는 사용자 ID 만 경고로 남긴다 (서고 수집과 같다)
      await this.access.assertCanTalk(userId);
    } catch (error) {
      if (!(error instanceof AppException)) this.logger.warn(`proactive access check failed user=${userId}`);
      return false;
    }

    // 먼저 차지한 서버만 건다 (리뷰 4). 상태는 실행 처음에 한꺼번에 읽어 오래됐을 수 있다 —
    // 읽은 뒤 다른 서버가 걸었거나(lastProactiveAt) 사용자가 말했으면(lastUserMessageAt) 차지하지 못한다
    const claimed = await this.prisma.galpiState.updateMany({
      where: { userId, lastProactiveAt: state.lastProactiveAt, lastUserMessageAt: state.lastUserMessageAt },
      data: { lastProactiveAt: now, unansweredProactive: { increment: 1 } },
    });
    if (claimed.count === 0) return false;

    let saved: GalpiMessage;
    try {
      const { bubble, crisis } = await this.compose(state);
      // 갈피가 위기 신호를 알렸으면(그 답을 버렸어도 남는다) 안부를 거는 자리가 아니다 — 억지로 보내느니 침묵이 낫다.
      // 차지는 그대로 둔다: 그날을 쓰고 답 없는 말 한 번으로 센다. 돌려놓으면 매시 같은 위기 대화를 다시 LLM(국외)으로 보낸다.
      // maxUnansweredProactive 번 이어지면 사용자가 다시 말할 때까지 멈춘다
      if (crisis !== 'none') return false;
      if (!bubble) {
        // 쓸 말이 없으면 보내지 않는다. 차지를 돌려놓아 다음 시각에 다시 본다
        await this.release(state, now);
        return false;
      }
      saved = await saveGalpiLine(this.prisma, userId, { content: bubble.text, expression: bubble.expression, proactive: true }, now);
    } catch (error) {
      // 말이 저장되기 전에 실패했다 — 보낸 것이 없으니 센 적도 없다. 오류는 runOnce 가 사용자 ID 만 남겨 기록한다
      await this.release(state, now);
      throw error;
    }
    await this.notify(userId, saved);
    this.logger.log(`proactive sent user=${userId}`);
    return true;
  }

  /** 차지를 돌려놓는다 — 차지한 그 값 그대로일 때만. 그 사이 사용자가 돌아와 값이 바뀌었으면 건드리지 않는다 */
  private async release(state: GalpiState, now: Date): Promise<void> {
    try {
      await this.prisma.galpiState.updateMany({
        where: { userId: state.userId, lastProactiveAt: now, unansweredProactive: state.unansweredProactive + 1 },
        data: { lastProactiveAt: state.lastProactiveAt, unansweredProactive: state.unansweredProactive },
      });
    } catch {
      this.logger.warn(`proactive release failed user=${state.userId}`);
    }
  }

  /** 첫 말풍선 하나만 쓰고 버튼은 버린다. 쓸 말이 없으면 bubble 이 null 이고, crisis 는 갈피가 알린 위기 신호다(버린 답이 알린 것도) */
  private async compose(state: GalpiState): Promise<{ bubble: ReplyBubble | null; crisis: CrisisKind }> {
    const user = await this.prisma.user.findUnique({ where: { id: state.userId }, select: { profile: { select: { displayName: true } } } });
    const { input } = await loadReplyInput(
      { prisma: this.prisma, wiki: this.wiki },
      state.userId,
      state,
      user?.profile?.displayName ?? null,
      { sensitiveJustNow: false, skipped: false },
    );
    const { reply, crisis } = await completeReply(
      this.llm,
      { userId: state.userId, purpose: 'proactive', messages: buildProactiveMessages(input) },
      findProactiveBanned,
    );
    return { bubble: reply?.bubbles[0] ?? null, crisis };
  }

  /** 잠금화면 문구는 티 나지 않게 — 제목은 "갈피", 본문은 갈피의 말 (AI 엔진 문서 7장, IA 3.11). 알림이 실패해도 대화방의 말은 남는다 */
  private async notify(userId: string, saved: GalpiMessage): Promise<void> {
    try {
      const token = await this.prisma.pushToken.findUnique({ where: { userId } });
      if (!token) return;
      const text = toMessageDto(saved, await loadRenderContext(this.prisma, userId)).text ?? '';
      const body = [...text].length > PUSH_BODY_MAX ? `${truncateCodePoints(text, PUSH_BODY_MAX - 1)}…` : text;
      const result = await this.push.send({ to: token.token, title: '갈피', body, data: { screen: 'galpi' } });
      if (result.status === 'error') this.logger.warn(`proactive push rejected user=${userId}`);
    } catch {
      this.logger.warn(`proactive push failed user=${userId}`);
    }
  }
}
