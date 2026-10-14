import { Logger } from '@nestjs/common';
import type { GalpiState } from '@prisma/client';
import {
  CONDITION_FACTS,
  findForbidden,
  type LlmMessage,
  type LlmProvider,
  POLICY,
  PRACTICAL_FACTS,
  pseudonymize,
  WIKI_PAGES,
  type WikiPageKey,
} from '@prologue/shared';
import type { PrismaService } from '../prisma/prisma.service';
import { pageGaps } from './known';
import { stripUnstorableChars } from './messages';
import type { HistoryLine, ReplyPromptInput } from './prompt/reply-prompt';
import { type ParsedReply, parseReply, readCrisisSignal } from './reply';
import type { CrisisKind } from './safety/crisis';
import { enforceVoice } from './voice';
import type { WikiService, WikiSnapshot } from './wiki/wiki.service';

const logger = new Logger('GalpiReply');

/** pseudonymize() 가 이름 자리에 넣는 말 — 갈피가 그대로 따라 쓰면 호칭 자리표시자로 돌린다 */
const PSEUDONYM_NAME = '[이름]';

/** 갈피 답 프롬프트의 사용자별 재료 — 서고, 빈칸, 아직 모르는 칸, 가명처리한 최근 대화 (대화·먼저 말 걸기) */
export async function loadReplyInput(
  deps: { prisma: Pick<PrismaService, 'galpiMessage'>; wiki: Pick<WikiService, 'snapshot'> },
  userId: string,
  state: Pick<GalpiState, 'speechLevel' | 'knownAt'>,
  displayName: string | null,
  flags: ReplyPromptInput['flags'],
): Promise<{ input: ReplyPromptInput; snapshot: WikiSnapshot }> {
  const snapshot = await deps.wiki.snapshot(userId);
  const recent = await deps.prisma.galpiMessage.findMany({
    where: { userId, kind: 'text' },
    orderBy: { createdAt: 'desc' },
    take: POLICY.galpi.historyWindow,
  });
  const history: HistoryLine[] = recent.reverse().map((m) => ({
    sender: m.sender === 'galpi' ? 'galpi' : 'user',
    text: m.sender === 'user' ? pseudonymize(m.content, { name: displayName }) : m.content,
  }));
  const claimCounts = Object.fromEntries(WIKI_PAGES.map((p) => [p, snapshot.pages[p].length])) as Record<WikiPageKey, number>;
  return {
    snapshot,
    input: {
      speechLevel: state.speechLevel,
      known: state.knownAt !== null,
      pages: Object.fromEntries(WIKI_PAGES.map((p) => [p, snapshot.pages[p].map((c) => c.text)])) as Record<WikiPageKey, string[]>,
      gaps: pageGaps(claimCounts),
      missingPractical: PRACTICAL_FACTS.filter((f) => !snapshot.facts[f]?.value),
      askableConditions: CONDITION_FACTS.filter((f) => !!snapshot.facts[f]?.value && snapshot.facts[f]?.letterAllowed === null),
      flags,
      history,
    },
  };
}

/** 위기 신호의 세기 — 큰 쪽이 더 센 신호다 */
const CRISIS_RANK: Record<CrisisKind, number> = { none: 0, danger: 1, self_harm: 2 };

function strongerCrisis(a: CrisisKind, b: CrisisKind): CrisisKind {
  return CRISIS_RANK[b] > CRISIS_RANK[a] ? b : a;
}

export interface ReplyOutcome {
  /** 쓸 수 있는 답. 없으면 null — 대화는 대체 문장으로 답하고, 먼저 말 걸기는 보내지 않는다 */
  reply: ParsedReply | null;
  /** JSON 으로 읽을 수 있었던 모든 시도가 알린 위기 신호 중 가장 센 것. 그 답을 버렸어도, 쓸 말풍선이 없었어도 남는다 */
  crisis: CrisisKind;
}

/**
 * 갈피 답을 받는다 — 금지 표현(과 extraBanned 가 찾은 말)이 나오거나 읽을 수 없으면 한 번 다시 묻는다.
 * 그래도 안 되거나 LLM 이 실패하면 reply 는 null (리뷰 1). 대화는 대체 문장으로 답하고, 먼저 말 걸기는 보내지 않는다.
 * crisis 는 JSON 으로 읽을 수 있었던 모든 시도(쓸 수 있는 말풍선이 없던 답 포함 — readCrisisSignal)가 알린 signals.crisis 중
 * 가장 센 것이다(self_harm > danger > none).
 * 금지 표현 등으로 그 답의 글을 버려도 갈피가 알린 위기 신호는 잃지 않는다 — 부르는 쪽이 안전 안내를 붙일 수 있게.
 * 받아들인 답이 있으면 그 답의 signals.crisis 도 같은 값으로 맞춰, 성공하면 crisis 와 reply.signals.crisis 가 늘 같다
 */
export async function completeReply(
  llm: LlmProvider,
  request: { userId: string; purpose: 'reply' | 'proactive'; messages: LlmMessage[] },
  extraBanned: (text: string) => string[] = () => [],
): Promise<ReplyOutcome> {
  let prompt = request.messages;
  let crisis: CrisisKind = 'none';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: string;
    try {
      const result = await llm.complete({
        purpose: request.purpose,
        userId: request.userId,
        messages: prompt,
        responseFormat: 'json',
        maxOutputTokens: 400,
      });
      raw = result.content;
    } catch {
      logger.warn(`${request.purpose} llm failed user=${request.userId}`);
      return { reply: null, crisis };
    }
    const parsed = parseReply(raw);
    // 글을 못 쓰게 되더라도 갈피가 알린 위기 신호는 남긴다 — 쓸 수 있는 말풍선이 없어 parseReply 가 null 인 답도
    crisis = strongerCrisis(crisis, parsed ? parsed.signals.crisis : readCrisisSignal(raw));
    // LLM 이 JSON 안에 \ud83d 처럼 짝 없는 서로게이트를 쓰면 저장이 거절될 수 있다 — 저장 전에 빼고, 비어 버린 말풍선은 버린다
    const bubbles = (parsed?.bubbles ?? [])
      .map((b) => ({ ...b, text: enforceVoice(stripUnstorableChars(b.text).split(PSEUDONYM_NAME).join('{name}')) }))
      .filter((b) => b.text);
    const banned = bubbles.flatMap((b) => [...findForbidden(b.text), ...extraBanned(b.text)]);
    if (parsed && bubbles.length > 0 && banned.length === 0) {
      // 버려진 앞 시도가 더 센 신호를 알렸다면 받아들인 답의 신호도 그 값으로 맞춘다 (crisis 와 reply.signals.crisis 는 늘 같다)
      return { reply: { ...parsed, bubbles, signals: { ...parsed.signals, crisis } }, crisis };
    }
    const note = banned.length
      ? `방금 답에 쓰지 않는 말(${banned.join(', ')})이 있었다. 그 말 없이 JSON 으로 다시 답한다.`
      : '방금 답이 형식에 맞지 않았다. 규칙대로 JSON 객체 하나로 다시 답한다.';
    prompt = [...request.messages, { role: 'system', content: note }];
  }
  // 로그에는 사용자 ID 만 — 답의 내용이나 걸린 말은 남기지 않는다 (CLAUDE.md 10.3)
  logger.warn(`${request.purpose} reply unusable user=${request.userId}`);
  return { reply: null, crisis };
}
