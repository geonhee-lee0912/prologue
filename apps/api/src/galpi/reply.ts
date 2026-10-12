import { GALPI_EXPRESSIONS, type GalpiExpression, isConditionFact, isPracticalFact, type QuickReplySpec } from '@prologue/shared';
import type { CrisisKind } from './safety/crisis';

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
  return { text: text.trim().slice(0, MAX_BUBBLE_LENGTH), expression: known ? (expression as GalpiExpression) : null };
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
