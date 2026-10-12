/**
 * 테스트용 메모리 Prisma — 갈피 서비스가 쓰는 질의 모양만 흉내 낸다.
 * - select 는 무시하고 행 전체를 돌려준다. 서비스는 select 한 필드만 읽어야 한다(실제 Prisma 타입이 지킨다)
 * - $transaction 은 되돌리기(rollback)를 하지 않는다
 * 실제 DB 테스트(RLS pgTAP·통합)는 출시 전 최종 점검에서 한다 (BACKLOG 9절)
 */
import { randomUUID } from 'node:crypto';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Where = Record<string, any>;

export interface FakeUserInput {
  id: string;
  status?: 'pending' | 'active' | 'suspended' | 'withdrawn';
  identityVerified?: boolean;
  displayName?: string | null;
  consents?: { consentType: string; agreed: boolean; agreedAt?: Date }[];
}

const AI_CONSENTS = ['sensitive_info', 'cross_border_transfer'];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function time(value: unknown): unknown {
  return value instanceof Date ? value.getTime() : value;
}

function same(a: unknown, b: unknown): boolean {
  return time(a ?? null) === time(b ?? null);
}

function fieldMatches(value: unknown, cond: unknown): boolean {
  if (cond === null || cond instanceof Date || typeof cond !== 'object') return same(value, cond);
  const c = cond as Row;
  if ('in' in c) return (c.in as unknown[]).some((x) => same(value, x));
  if ('not' in c) return !same(value, c.not);
  const v = time(value);
  if (v === null || v === undefined) return false;
  const n = v as number;
  if ('lt' in c && !(n < (time(c.lt) as number))) return false;
  if ('lte' in c && !(n <= (time(c.lte) as number))) return false;
  if ('gt' in c && !(n > (time(c.gt) as number))) return false;
  if ('gte' in c && !(n >= (time(c.gte) as number))) return false;
  return true;
}

export function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, cond]) => cond === undefined || fieldMatches(row[key], cond));
}

function sortRows(rows: Row[], orderBy?: Row): Row[] {
  if (!orderBy) return rows;
  const [key, dir] = Object.entries(orderBy)[0];
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = time(a[key]) as number;
    const y = time(b[key]) as number;
    return x < y ? -sign : x > y ? sign : 0;
  });
}

function applyData(row: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
      if ('increment' in value) {
        row[key] = (row[key] ?? 0) + value.increment;
        continue;
      }
      if ('decrement' in value) {
        row[key] = (row[key] ?? 0) - value.decrement;
        continue;
      }
    }
    row[key] = value;
  }
  if ('updatedAt' in row) row.updatedAt = new Date();
}

export class FakePrisma {
  users: Row[] = [];
  galpiStates: Row[] = [];
  galpiMessages: Row[] = [];
  wikiClaims: Row[] = [];
  wikiClaimSources: { claimId: string; messageId: string }[] = [];
  profileFacts: Row[] = [];
  selfReports: Row[] = [];
  llmUsages: Row[] = [];
  pushTokens: Row[] = [];

  /** 기본은 본인인증과 갈피 동의를 마친 활성 사용자 */
  addUser(input: FakeUserInput): void {
    const consents = input.consents ?? AI_CONSENTS.map((consentType) => ({ consentType, agreed: true }));
    this.users.push({
      id: input.id,
      status: input.status ?? 'active',
      identityVerified: input.identityVerified ?? true,
      displayName: input.displayName ?? null,
      consents: consents.map((c, i) => ({ agreedAt: new Date(Date.UTC(2026, 9, 1, 0, 0, i)), ...c })),
    });
  }

  user = {
    findUnique: async ({ where }: { where: { id: string }; select?: Row }) => {
      const u = this.users.find((x) => x.id === where.id);
      if (!u) return null;
      return clone({
        id: u.id,
        status: u.status,
        auth: { identityVerified: u.identityVerified },
        profile: { displayName: u.displayName },
        consents: sortRows(u.consents, { agreedAt: 'desc' }),
      }) as Row;
    },
  };

  galpiState = {
    findUnique: async ({ where }: { where: { userId: string } }) =>
      clone(this.galpiStates.find((s) => s.userId === where.userId) ?? null) as Row | null,
    findMany: async ({ where }: { where?: Where } = {}) => this.galpiStates.filter((s) => matches(s, where)).map(clone),
    create: async ({ data }: { data: Row }) => {
      if (this.galpiStates.some((s) => s.userId === data.userId)) {
        throw new Error('Unique constraint failed on the fields: (`user_id`)');
      }
      const now = new Date();
      const row = {
        firstMeetingAt: now,
        userTurns: 0,
        turnsSinceIngest: 0,
        knownAt: null,
        speechLevel: 'mixed',
        casualOfferedAt: null,
        lastUserMessageAt: null,
        lastProactiveAt: null,
        unansweredProactive: 0,
        lastIngestAt: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      this.galpiStates.push(row);
      return clone(row);
    },
    update: async ({ where, data }: { where: { userId: string }; data: Row }) => {
      const row = this.galpiStates.find((s) => s.userId === where.userId);
      if (!row) throw new Error('Record to update not found: galpi_states');
      applyData(row, data);
      return clone(row);
    },
    updateMany: async ({ where, data }: { where: Where; data: Row }) => {
      const rows = this.galpiStates.filter((s) => matches(s, where));
      rows.forEach((r) => applyData(r, data));
      return { count: rows.length };
    },
  };

  galpiMessage = {
    create: async ({ data }: { data: Row }) => {
      const row = {
        id: randomUUID(),
        kind: 'text',
        expression: null,
        quickReply: null,
        answeredKey: null,
        skipped: false,
        proactive: false,
        safety: false,
        sensitiveCategories: [],
        createdAt: new Date(),
        ...data,
      };
      this.galpiMessages.push(row);
      return clone(row);
    },
    findMany: async ({ where, orderBy, take }: { where?: Where; orderBy?: Row; take?: number; select?: Row } = {}) => {
      const rows = sortRows(this.galpiMessages.filter((m) => matches(m, where)), orderBy);
      return (take ? rows.slice(0, take) : rows).map(clone);
    },
    findFirst: async ({ where, orderBy }: { where?: Where; orderBy?: Row; select?: Row } = {}) => {
      const rows = sortRows(this.galpiMessages.filter((m) => matches(m, where)), orderBy);
      return rows[0] ? clone(rows[0]) : null;
    },
    updateMany: async ({ where, data }: { where: Where; data: Row }) => {
      const rows = this.galpiMessages.filter((m) => matches(m, where));
      rows.forEach((r) => applyData(r, data));
      return { count: rows.length };
    },
    deleteMany: async ({ where }: { where: Where }) => {
      const ids = new Set(this.galpiMessages.filter((m) => matches(m, where)).map((m) => m.id));
      this.galpiMessages = this.galpiMessages.filter((m) => !ids.has(m.id));
      this.wikiClaimSources = this.wikiClaimSources.filter((s) => !ids.has(s.messageId));
      return { count: ids.size };
    },
  };

  wikiClaim = {
    findMany: async ({ where, orderBy, include }: { where?: Where; orderBy?: Row; include?: { sources?: boolean }; select?: Row } = {}) =>
      sortRows(this.wikiClaims.filter((c) => this.claimMatches(c, where)), orderBy).map((c) => this.withSources(c, include)),
    findFirst: async ({ where, include }: { where?: Where; include?: { sources?: boolean } } = {}) => {
      const claim = this.wikiClaims.find((c) => this.claimMatches(c, where));
      return claim ? this.withSources(claim, include) : null;
    },
    create: async ({ data }: { data: Row }) => {
      const { sources, ...rest } = data;
      const now = new Date();
      const row = { id: randomUUID(), createdAt: now, updatedAt: now, ...rest };
      this.wikiClaims.push(row);
      for (const s of sources?.create ?? []) this.wikiClaimSources.push({ claimId: row.id, messageId: s.messageId });
      return clone(row);
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = this.wikiClaims.find((c) => c.id === where.id);
      if (!row) throw new Error('Record to update not found: wiki_claims');
      const { sources, ...rest } = data;
      applyData(row, rest);
      if (sources?.deleteMany) this.wikiClaimSources = this.wikiClaimSources.filter((s) => s.claimId !== row.id);
      for (const s of sources?.create ?? []) {
        if (this.wikiClaimSources.some((x) => x.claimId === row.id && x.messageId === s.messageId)) {
          throw new Error('Unique constraint failed on the fields: (`claim_id`,`message_id`)');
        }
        this.wikiClaimSources.push({ claimId: row.id, messageId: s.messageId });
      }
      return clone(row);
    },
    deleteMany: async ({ where }: { where: Where }) => {
      const ids = new Set(this.wikiClaims.filter((c) => this.claimMatches(c, where)).map((c) => c.id));
      this.wikiClaims = this.wikiClaims.filter((c) => !ids.has(c.id));
      this.wikiClaimSources = this.wikiClaimSources.filter((s) => !ids.has(s.claimId));
      return { count: ids.size };
    },
  };

  profileFact = {
    findMany: async ({ where }: { where?: Where; select?: Row } = {}) => this.profileFacts.filter((f) => matches(f, where)).map(clone),
    upsert: async ({ where, create, update }: { where: { userId_key: { userId: string; key: string } }; create: Row; update: Row }) => {
      const { userId, key } = where.userId_key;
      const row = this.profileFacts.find((f) => f.userId === userId && f.key === key);
      if (row) {
        applyData(row, update);
        return clone(row);
      }
      const now = new Date();
      const created = { id: randomUUID(), value: null, letterAllowed: null, verified: false, createdAt: now, updatedAt: now, ...create };
      this.profileFacts.push(created);
      return clone(created);
    },
  };

  selfReport = {
    count: async ({ where }: { where?: Where } = {}) => this.selfReports.filter((r) => matches(r, where)).length,
    create: async ({ data }: { data: Row }) => {
      const row = { id: randomUUID(), paid: false, createdAt: new Date(), ...data };
      this.selfReports.push(row);
      return clone(row);
    },
    findFirst: async ({ where, orderBy }: { where?: Where; orderBy?: Row } = {}) => {
      const rows = sortRows(this.selfReports.filter((r) => matches(r, where)), orderBy);
      return rows[0] ? clone(rows[0]) : null;
    },
  };

  llmUsage = {
    create: async ({ data }: { data: Row }) => {
      const row = { id: randomUUID(), cachedInputTokens: 0, createdAt: new Date(), ...data };
      this.llmUsages.push(row);
      return clone(row);
    },
  };

  pushToken = {
    findUnique: async ({ where }: { where: { userId: string } }) => clone(this.pushTokens.find((t) => t.userId === where.userId) ?? null) as Row | null,
    upsert: async ({ where, create, update }: { where: { userId: string }; create: Row; update: Row }) => {
      const row = this.pushTokens.find((t) => t.userId === where.userId);
      if (row) {
        applyData(row, update);
        return clone(row);
      }
      const created = { updatedAt: new Date(), ...create };
      this.pushTokens.push(created);
      return clone(created);
    },
    deleteMany: async ({ where }: { where: Where }) => {
      const before = this.pushTokens.length;
      this.pushTokens = this.pushTokens.filter((t) => !matches(t, where));
      return { count: before - this.pushTokens.length };
    },
  };

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  private claimMatches(claim: Row, where: Where = {}): boolean {
    const { sources, ...rest } = where;
    if (sources && 'none' in sources && this.wikiClaimSources.some((s) => s.claimId === claim.id)) return false;
    return matches(claim, rest);
  }

  private withSources(claim: Row, include?: { sources?: boolean }): Row {
    const row = clone(claim);
    if (include?.sources) row.sources = this.wikiClaimSources.filter((s) => s.claimId === claim.id).map(clone);
    return row;
  }
}
