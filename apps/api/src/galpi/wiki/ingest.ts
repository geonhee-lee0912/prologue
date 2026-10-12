import { type ConditionFact, isConditionFact, maskSensitive, redactContacts, type WikiPageKey } from '@prologue/shared';
import { truncateCodePoints } from '../text';

export interface IngestAdd {
  page: WikiPageKey;
  text: string;
  sources: string[];
}

export interface IngestUpdate {
  id: string;
  text: string;
  /** 새로 더할 출처. 비어 있으면 기존 출처만 남는다 */
  sources: string[];
}

export interface IngestFact {
  key: ConditionFact;
  value: string;
}

export interface IngestOps {
  adds: IngestAdd[];
  updates: IngestUpdate[];
  removes: string[];
  facts: IngestFact[];
}

export interface IngestContext {
  /** 이번에 정리하는 사용자 말의 id — 출처는 이 안에서만 */
  batchUserMessageIds: ReadonlySet<string>;
  /** 이 사용자의 기존 문장 id → 장 */
  existingClaims: ReadonlyMap<string, WikiPageKey>;
  maxClaimsPerPage: number;
}

/** 수집으로 쓸 수 있는 장 — 만난 뒤 이야기는 2단계 */
export const WRITABLE_PAGES: readonly WikiPageKey[] = ['now', 'people', 'relationship', 'attraction', 'next_topics'];

/** 문장·값 길이 상한 — 코드 포인트로 센다 */
const MAX_CLAIM_LENGTH = 200;
const MAX_FACT_LENGTH = 40;

/** LLM 수집 결과를 검증해 적용할 작업만 남긴다 */
export function parseIngest(raw: string, ctx: IngestContext): IngestOps {
  const ops: IngestOps = { adds: [], updates: [], removes: [], facts: [] };
  const json = parseJson(raw);
  if (!json) return ops;

  const removes = new Set<string>();
  const updates = new Map<string, IngestUpdate>();
  const adds: IngestAdd[] = [];
  for (const item of Array.isArray(json.claims) ? json.claims : []) {
    if (!item || typeof item !== 'object') continue;
    const claim = item as Record<string, unknown>;
    if (claim.op === 'remove') {
      if (typeof claim.id === 'string' && ctx.existingClaims.has(claim.id)) removes.add(claim.id);
      continue;
    }
    const text = cleanText(claim.text);
    if (!text) continue;
    const sources = cleanSources(claim.sources, ctx.batchUserMessageIds);
    if (claim.op === 'add' && typeof claim.page === 'string' && (WRITABLE_PAGES as readonly string[]).includes(claim.page) && sources.length > 0) {
      adds.push({ page: claim.page as WikiPageKey, text, sources });
    } else if (claim.op === 'update' && typeof claim.id === 'string' && ctx.existingClaims.has(claim.id)) {
      // 같은 문장을 두 번 고치라고 해도 하나로 합친다(뒤의 글이 이긴다) — 같은 출처를 두 번 달면 DB 가 거절하고 묶음이 통째로 실패한다
      const earlier = updates.get(claim.id);
      updates.set(claim.id, { id: claim.id, text, sources: earlier ? [...new Set([...earlier.sources, ...sources])] : sources });
    }
  }
  ops.removes = [...removes];
  ops.updates = [...updates.values()].filter((u) => !removes.has(u.id));

  // 장 하나에 담는 문장 수를 지킨다 — 빼는 문장을 먼저 센다
  const counts = new Map<WikiPageKey, number>();
  for (const [id, page] of ctx.existingClaims) if (!removes.has(id)) counts.set(page, (counts.get(page) ?? 0) + 1);
  for (const add of adds) {
    const n = counts.get(add.page) ?? 0;
    if (n >= ctx.maxClaimsPerPage) continue;
    counts.set(add.page, n + 1);
    ops.adds.push(add);
  }

  for (const item of Array.isArray(json.facts) ? json.facts : []) {
    if (!item || typeof item !== 'object') continue;
    const { key, value } = item as Record<string, unknown>;
    if (typeof key !== 'string' || !isConditionFact(key) || typeof value !== 'string') continue;
    const trimmed = truncateCodePoints(value.trim(), MAX_FACT_LENGTH);
    if (!trimmed || maskSensitive(trimmed).categories.length > 0 || redactContacts(trimmed) !== trimmed) continue;
    ops.facts.push({ key, value: trimmed });
  }
  return ops;
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(
      raw
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, ''),
    );
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 민감정보·연락처가 섞인 문장은 서고에 두지 않는다 (AI 엔진 문서 3.5·3.8) */
function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = truncateCodePoints(value.trim(), MAX_CLAIM_LENGTH);
  if (!text || text.includes('[민감정보:') || maskSensitive(text).categories.length > 0) return null;
  return redactContacts(text) === text ? text : null;
}

function cleanSources(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === 'string' && allowed.has(v)))];
}
