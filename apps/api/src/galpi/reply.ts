import { GALPI_EXPRESSIONS, type GalpiExpression, isConditionFact, isPracticalFact, type QuickReplySpec } from '@prologue/shared';
import type { CrisisKind } from './safety/crisis';
import { truncateCodePoints } from './text';

export interface ReplyBubble {
  text: string;
  expression: GalpiExpression | null;
}

export interface ReplySignals {
  userUsedCasual: boolean;
  crisis: CrisisKind;
}

export interface ParsedReply {
  bubbles: ReplyBubble[];
  quickReply: QuickReplySpec | null;
  signals: ReplySignals;
}

const MAX_BUBBLES = 2;
/** 말풍선 길이 상한 — 코드 포인트로 센다. UTF-16 칸으로 자르면 이모지(두 칸)를 반으로 갈라 깨진 문자열이 남는다 */
const MAX_BUBBLE_LENGTH = 300;

/** 갈피 답(JSON)을 읽는다. 읽을 수 없으면 null — 부르는 쪽이 대체 문장을 쓴다 (리뷰 1) */
export function parseReply(raw: string): ParsedReply | null {
  const json = extractJson(raw);
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  const bubbles = (Array.isArray(obj.messages) ? obj.messages : [])
    .map(toBubble)
    .filter((b): b is ReplyBubble => b !== null)
    .slice(0, MAX_BUBBLES);
  if (bubbles.length === 0) return null;
  return { bubbles, quickReply: toQuickReply(obj.quickReply), signals: toSignals(obj.signals) };
}

/**
 * 갈피 답(JSON)이 알린 위기 신호만 읽는다 — 쓸 수 있는 말풍선이 없어 parseReply 가 null 이어도 신호는 잃지 않게 (reply-llm.ts).
 * JSON 객체가 아니거나 신호가 없거나 틀리면 'none'. 말풍선이 있는 답에서는 parseReply 의 signals.crisis 와 같다
 */
export function readCrisisSignal(raw: string): CrisisKind {
  const json = extractJson(raw);
  if (!json || typeof json !== 'object' || Array.isArray(json)) return 'none';
  return toSignals((json as Record<string, unknown>).signals).crisis;
}

function extractJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function toBubble(value: unknown): ReplyBubble | null {
  if (!value || typeof value !== 'object') return null;
  const { text, expression } = value as Record<string, unknown>;
  if (typeof text !== 'string' || !text.trim()) return null;
  const known = typeof expression === 'string' && (GALPI_EXPRESSIONS as readonly string[]).includes(expression);
  return { text: truncateCodePoints(text.trim(), MAX_BUBBLE_LENGTH), expression: known ? (expression as GalpiExpression) : null };
}

/** 말 놓기 버튼은 서버만 건넨다 — 갈피가 내면 버린다 */
function toQuickReply(value: unknown): QuickReplySpec | null {
  if (!value || typeof value !== 'object') return null;
  const { type, fact } = value as Record<string, unknown>;
  if (typeof fact !== 'string') return null;
  if (type === 'condition_permission' && isConditionFact(fact)) return { type, fact };
  if (type === 'practical' && isPracticalFact(fact)) return { type, fact };
  return null;
}

function toSignals(value: unknown): ReplySignals {
  const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const crisis: CrisisKind = obj.crisis === 'danger' || obj.crisis === 'self_harm' ? obj.crisis : 'none';
  return { userUsedCasual: obj.userUsedCasual === true, crisis };
}
