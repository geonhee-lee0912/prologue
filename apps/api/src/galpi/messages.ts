import type { GalpiMessage, Prisma } from '@prisma/client';
import {
  GALPI_EXPRESSIONS,
  type GalpiExpression,
  type GalpiMessageDto,
  isConditionFact,
  isPracticalFact,
  MASKED_TEXT_DISPLAY,
  type QuickReplySpec,
  quickReplyOptions,
  renderName,
} from '@prologue/shared';
import type { PrismaService } from '../prisma/prisma.service';

export interface MessageRenderContext {
  displayName: string | null;
  /** 말을 놓은 때. 이 뒤의 갈피 말만 반말 호칭이다 — 지난 대화의 호칭은 바뀌지 않는다 */
  casualSince: Date | null;
}

/** 짝 없는 서로게이트(u 플래그에서 \p{Surrogate} 는 짝이 맞지 않은 글자만 잡는다 — 이모지는 그대로)와 널 문자 */
const UNSTORABLE_CHARS = /\p{Surrogate}|\u0000/gu;

/**
 * 저장할 수 없는 글자를 뺀다. 짝 없는 서로게이트는 Prisma 엔진이, 널 문자는 PostgreSQL 이 저장을 거절해 500 으로 끝날 수 있다 (리뷰 1).
 * 사용자 말과 LLM 답 모두 저장하기 전에 거친다
 */
export function stripUnstorableChars(text: string): string {
  return text.replace(UNSTORABLE_CHARS, '');
}

/** 저장된 버튼 { type, fact? } 를 읽는다. 모양이 틀리면 null */
export function readQuickReply(value: unknown): QuickReplySpec | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { type, fact } = value as Record<string, unknown>;
  if (type === 'speech_level') return { type };
  if (typeof fact !== 'string') return null;
  if (type === 'condition_permission' && isConditionFact(fact)) return { type, fact };
  if (type === 'practical' && isPracticalFact(fact)) return { type, fact };
  return null;
}

function toExpression(value: string | null): GalpiExpression | null {
  return value && (GALPI_EXPRESSIONS as readonly string[]).includes(value) ? (value as GalpiExpression) : null;
}

/** 응답 DTO — 갈피 말의 {name} 은 여기서 바꾸고, 내 말의 가린 자리는 알아볼 수 있게 보인다 */
export function toMessageDto(m: GalpiMessage, ctx: MessageRenderContext): GalpiMessageDto {
  const base = { id: m.id, from: m.sender === 'galpi' ? ('galpi' as const) : ('me' as const), at: m.createdAt.toISOString() };
  if (m.kind === 'emoticon') return { ...base, kind: 'emoticon', expression: toExpression(m.expression) ?? 'welcome' };

  const style = ctx.casualSince && m.createdAt >= ctx.casualSince ? 'casual' : 'mixed';
  const text =
    m.sender === 'galpi'
      ? renderName(m.content, ctx.displayName, style)
      : m.content.replace(/\[민감정보:[^\]]+\]/g, MASKED_TEXT_DISPLAY);
  const expression = toExpression(m.expression);
  const spec = readQuickReply(m.quickReply);
  return {
    ...base,
    kind: 'text',
    text,
    ...(expression ? { expression } : {}),
    ...(spec
      ? {
          quickReply: {
            type: spec.type,
            ...(spec.fact ? { fact: spec.fact } : {}),
            options: quickReplyOptions(spec),
            answeredKey: m.answeredKey,
          },
        }
      : {}),
  };
}

/**
 * 이름과 말 놓은 때 — 갈피 말의 {name} 을 바꿀 때
 * 말 놓기는 꺼낸 뒤 버튼으로 받으므로 꺼낸 때(casualOfferedAt)를 경계로 쓴다. 꺼내고 답하기 전 몇 마디가 반말 호칭으로 보일 수 있지만
 * 그 사이에 {name} 이 나올 일은 드물다
 */
export async function loadRenderContext(prisma: Pick<PrismaService, 'user' | 'galpiState'>, userId: string): Promise<MessageRenderContext> {
  const [user, state] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { profile: { select: { displayName: true } } } }),
    prisma.galpiState.findUnique({ where: { userId } }),
  ]);
  const casualSince = state?.speechLevel === 'casual' ? (state.casualOfferedAt ?? state.firstMeetingAt) : null;
  return { displayName: user?.profile?.displayName ?? null, casualSince };
}

export interface GalpiLine {
  kind?: 'text' | 'emoticon';
  content: string;
  expression?: string | null;
  quickReply?: QuickReplySpec | null;
  safety?: boolean;
  proactive?: boolean;
}

function toJson(spec: QuickReplySpec): Prisma.InputJsonObject {
  return spec.fact ? { type: spec.type, fact: spec.fact } : { type: spec.type };
}

/** 갈피 말 하나를 저장한다 */
export function saveGalpiLine(prisma: Pick<PrismaService, 'galpiMessage'>, userId: string, line: GalpiLine, at: Date): Promise<GalpiMessage> {
  return prisma.galpiMessage.create({
    data: {
      userId,
      sender: 'galpi',
      kind: line.kind ?? 'text',
      content: line.content,
      expression: line.expression ?? null,
      quickReply: line.quickReply ? toJson(line.quickReply) : undefined,
      safety: line.safety ?? false,
      proactive: line.proactive ?? false,
      createdAt: at,
    },
  });
}
