import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCode, GALPI_COPY, type GalpiTurnResultDto, type QuickReplySpec, quickReplyOptions } from '@prologue/shared';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { GalpiAccessService } from './access.service';
import { KnownService } from './known.service';
import { loadRenderContext, readQuickReply, saveGalpiLine, toMessageDto } from './messages';

type AnswerTx = Pick<PrismaService, 'galpiState' | 'profileFact'>;

/**
 * 갈피가 건넨 버튼에 답하기 — 조건 허락, 실용 정보, 말 놓기 (AI 엔진 문서 5.2·5.3)
 * LLM 을 부르지 않는다. 버튼 하나에는 한 번만 답한다 (리뷰 2)
 */
@Injectable()
export class QuickReplyService {
  private readonly logger = new Logger(QuickReplyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: GalpiAccessService,
    private readonly known: KnownService,
  ) {}

  /** 결과의 messages 는 [내 답, 갈피 답] */
  async answer(userId: string, messageId: string, key: string, now = new Date()): Promise<GalpiTurnResultDto> {
    await this.access.assertCanTalk(userId);
    const question = await this.prisma.galpiMessage.findFirst({ where: { id: messageId, userId, sender: 'galpi' } });
    const spec = question ? readQuickReply(question.quickReply) : null;
    const option = spec ? quickReplyOptions(spec).find((o) => o.key === key) : undefined;
    if (!spec || !option) {
      throw new AppException(ErrorCode.QUICK_REPLY_INVALID, '이 버튼에는 답할 수 없어요.', HttpStatus.BAD_REQUEST);
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      // 먼저 차지한 요청만 답한다 — 더블 탭·재시도·동시 요청
      const claimed = await tx.galpiMessage.updateMany({
        where: { id: messageId, userId, answeredKey: null },
        data: { answeredKey: key },
      });
      if (claimed.count === 0) {
        throw new AppException(ErrorCode.QUICK_REPLY_INVALID, '이미 답한 질문이에요.', HttpStatus.CONFLICT);
      }
      const ack = await applyAnswer(tx, userId, spec, key);
      // 버튼 답은 턴으로 세지 않는다(성의 검증은 직접 한 말로, 스펙 5.4). 돌아온 것으로는 본다 (스펙 7장)
      const echo = await tx.galpiMessage.create({
        data: { userId, sender: 'user', kind: 'text', content: option.label, createdAt: now },
      });
      await tx.galpiState.update({ where: { userId }, data: { lastUserMessageAt: now, unansweredProactive: 0 } });
      const reply = await saveGalpiLine(tx, userId, { content: ack }, new Date(now.getTime() + 1));
      return [echo, reply];
    });

    if (spec.type === 'practical') {
      // 실용 정보가 모이면 알게 됨이 될 수 있다. 첫 리포트는 오래 걸려 기다리지 않는다 — 대화방에 나중에 도착한다
      void this.known.checkAndMarkKnown(userId, now).catch(() => this.logger.warn(`known check failed user=${userId}`));
    }
    const ctx = await loadRenderContext(this.prisma, userId);
    return { messages: saved.map((m) => toMessageDto(m, ctx)) };
  }
}

/** 답을 반영하고 갈피의 고정 대사를 고른다 */
async function applyAnswer(tx: AnswerTx, userId: string, spec: QuickReplySpec, key: string): Promise<string> {
  if (spec.type === 'speech_level') {
    if (key === 'casual') await tx.galpiState.update({ where: { userId }, data: { speechLevel: 'casual' } });
    return key === 'casual' ? GALPI_COPY.speechAck.casual : GALPI_COPY.speechAck.keep;
  }
  if (!spec.fact) throw new AppException(ErrorCode.QUICK_REPLY_INVALID, '이 버튼에는 답할 수 없어요.', HttpStatus.BAD_REQUEST);
  const where = { userId_key: { userId, key: spec.fact } };
  if (spec.type === 'condition_permission') {
    const letterAllowed = key === 'allow';
    await tx.profileFact.upsert({ where, create: { userId, key: spec.fact, letterAllowed }, update: { letterAllowed } });
    return letterAllowed ? GALPI_COPY.conditionAck.allow : GALPI_COPY.conditionAck.deny;
  }
  await tx.profileFact.upsert({ where, create: { userId, key: spec.fact, value: key }, update: { value: key } });
  return GALPI_COPY.practicalAck;
}
