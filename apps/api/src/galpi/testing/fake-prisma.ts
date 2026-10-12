/**
 * 테스트용 메모리 Prisma — 갈피 서비스가 쓰는 질의 모양만 흉내 낸다.
 * - 흉내 내지 않는 질의 모양은 조용히 넘기지 않고 `FakePrisma: unsupported …` 오류를 던진다:
 *   모르는 연산자·중첩 not·OR/AND/NOT, sources: { none: {} } 밖의 관계 필터, 배열이나 여러 키 orderBy,
 *   skip·cursor·distinct, 0 이하 take, 적용하지 않는 메서드에 넘긴 take·orderBy 같은 인자,
 *   중첩 sources 쓰기 중 create 와 빈 deleteMany 밖의 것.
 *   계획 밖 질의를 쓴 서비스가 거짓으로 통과하지 않게 한다. 그런 질의가 정말 필요하면 여기에 흉내를 더하고 spec 으로 고정한다
 * - select 는 무시하고 행 전체를 돌려준다. 서비스는 select 한 필드만 읽어야 한다(실제 Prisma 타입이 지킨다)
 * - $transaction 은 되돌리기(rollback)도 격리(isolation)도 하지 않는다 — 콜백이 같은 메모리에서 바로 돈다
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

/** 흉내 내지 않는 모양은 조용히 넘기지 않고 던진다. 메시지에는 연산자·칸·인자 이름만 쓴다 — 값(본문·이름)은 쓰지 않는다 */
function unsupported(what: string): never {
  throw new Error(`FakePrisma: unsupported ${what}`);
}

function isPlainObject(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/** 메서드가 읽는 인자만 받는다. select 만 무시한다 — skip·cursor·distinct 나 적용하지 않는 take·orderBy 는 말없이 넘기지 않는다 */
function checkArgs(method: string, args: Row, allowed: readonly string[]): void {
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && key !== 'select' && !allowed.includes(key)) unsupported(`argument "${key}" on ${method}`);
  }
}

const COMPARISONS: Record<string, (a: any, b: any) => boolean> = {
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
};

/** 한 칸의 조건이 흉내 낼 수 있는 모양인지 본다 — 등호(null·Date 포함)와 in·not(스칼라·null)·lt·lte·gt·gte */
function checkFilter(field: string, cond: unknown): void {
  if (cond === null || cond instanceof Date || typeof cond !== 'object') return;
  if (Array.isArray(cond)) unsupported(`array filter on "${field}"`);
  for (const [op, operand] of Object.entries(cond as Row)) {
    // Prisma 처럼 undefined 인 연산자는 없는 것으로 본다
    if (operand === undefined) continue;
    if (op === 'in') {
      if (!Array.isArray(operand)) unsupported(`"in" operand on "${field}" (an array is required)`);
    } else if (op === 'not') {
      if (typeof operand === 'object' && operand !== null && !(operand instanceof Date)) unsupported(`nested "not" filter on "${field}"`);
    } else if (Object.hasOwn(COMPARISONS, op)) {
      if (!(operand instanceof Date || typeof operand === 'number' || typeof operand === 'string')) {
        unsupported(`"${op}" operand on "${field}" (a number, string or Date is required)`);
      }
    } else {
      unsupported(`filter operator "${op}" on "${field}"`);
    }
  }
}

/** where 의 모양을 본다. 행이 하나도 없어도 흉내 내지 않는 모양은 드러나도록 질의 앞에서 부른다 */
function checkWhere(where: Where = {}): void {
  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;
    if (key === 'OR' || key === 'AND' || key === 'NOT') unsupported(`where key "${key}"`);
    checkFilter(key, cond);
  }
}

function fieldMatches(value: unknown, cond: unknown): boolean {
  if (cond === null || cond instanceof Date || typeof cond !== 'object') return same(value, cond);
  const c = cond as Row;
  if (c.in !== undefined && !(c.in as unknown[]).some((x) => same(value, x))) return false;
  if (c.not !== undefined && same(value, c.not)) return false;
  const v = time(value);
  for (const [op, compare] of Object.entries(COMPARISONS)) {
    if (c[op] === undefined) continue;
    if (v === null || v === undefined || !compare(v, time(c[op]))) return false;
  }
  return true;
}

function evaluate(row: Row, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => cond === undefined || fieldMatches(row[key], cond));
}

/** 한 칸에 연산자가 여럿이면 모두 맞아야 한다 */
export function matches(row: Row, where: Where = {}): boolean {
  checkWhere(where);
  return evaluate(row, where);
}

function filterRows(rows: Row[], where: Where = {}): Row[] {
  checkWhere(where);
  return rows.filter((row) => evaluate(row, where));
}

/** orderBy 는 키 하나에 asc·desc 만 흉내 낸다 (배열·여러 키·{ sort, nulls } 는 던진다) */
function sortRows(rows: Row[], orderBy?: unknown): Row[] {
  if (orderBy === undefined) return rows;
  const keys = isPlainObject(orderBy) ? Object.entries(orderBy).filter(([, d]) => d !== undefined) : [];
  if (keys.length !== 1) unsupported('orderBy (exactly one key is supported; an array or several keys are not)');
  const [[key, dir]] = keys;
  if (dir !== 'asc' && dir !== 'desc') unsupported(`orderBy direction on "${key}" (only "asc" or "desc")`);
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = time(a[key]) as number;
    const y = time(b[key]) as number;
    return x < y ? -sign : x > y ? sign : 0;
  });
}

/** take 는 양수만 흉내 낸다 (Prisma 의 음수 take 는 뒤에서부터 센다) */
function checkTake(method: string, take: unknown): number | undefined {
  if (take === undefined) return undefined;
  if (typeof take !== 'number' || !Number.isInteger(take) || take <= 0) unsupported(`take on ${method} (only a positive integer is supported)`);
  return take;
}

/** include 는 { sources: true } 만 흉내 낸다 */
function includesSources(method: string, include: unknown): boolean {
  if (include === undefined) return false;
  if (!isPlainObject(include)) unsupported(`include on ${method}`);
  for (const [key, value] of Object.entries(include)) {
    if (value !== undefined && (key !== 'sources' || typeof value !== 'boolean')) {
      unsupported(`include "${key}" on ${method} (only { sources: true } is supported)`);
    }
  }
  return include.sources === true;
}

/**
 * 문장을 쓸 때 딸린 sources — create: [{ messageId }] 만 흉내 낸다. update 에서는 빈 deleteMany: {}(그 문장의 출처를 모두 지운다)도 된다.
 * 조건이 있는 deleteMany 나 set·connect·createMany 같은 다른 중첩 연산은 던진다. 아무것도 바꾸기 전에 모양부터 본다
 */
function readSourceWrites(sources: unknown, allowDeleteAll: boolean): { deleteAll: boolean; messageIds: string[] } {
  if (sources === undefined) return { deleteAll: false, messageIds: [] };
  if (!isPlainObject(sources)) unsupported('nested "sources" write (an object is required)');
  let deleteAll = false;
  for (const [op, operand] of Object.entries(sources)) {
    if (operand === undefined || op === 'create') continue;
    if (op !== 'deleteMany' || !allowDeleteAll) unsupported(`nested "sources" operation "${op}"`);
    if (!isPlainObject(operand) || Object.keys(operand).length > 0) unsupported('nested "sources.deleteMany" with a filter (only {} is supported)');
    deleteAll = true;
  }
  const items = sources.create === undefined ? [] : sources.create;
  if (!Array.isArray(items)) unsupported('nested "sources.create" (an array is required)');
  const messageIds = items.map((item: unknown) => {
    if (!isPlainObject(item) || Object.keys(item).length !== 1 || typeof item.messageId !== 'string') {
      unsupported('nested "sources.create" item (only { messageId: string } is supported)');
    }
    return item.messageId as string;
  });
  return { deleteAll, messageIds };
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
    findUnique: async (args: { where: { id: string }; select?: Row }) => {
      checkArgs('user.findUnique', args, ['where']);
      const u = this.users.find((x) => x.id === args.where.id);
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
    findUnique: async (args: { where: { userId: string } }) => {
      checkArgs('galpiState.findUnique', args, ['where']);
      return clone(this.galpiStates.find((s) => s.userId === args.where.userId) ?? null) as Row | null;
    },
    findMany: async (args: { where?: Where } = {}) => {
      checkArgs('galpiState.findMany', args, ['where']);
      return filterRows(this.galpiStates, args.where).map(clone);
    },
    create: async (args: { data: Row }) => {
      checkArgs('galpiState.create', args, ['data']);
      const { data } = args;
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
    update: async (args: { where: { userId: string }; data: Row }) => {
      checkArgs('galpiState.update', args, ['where', 'data']);
      const row = this.galpiStates.find((s) => s.userId === args.where.userId);
      if (!row) throw new Error('Record to update not found: galpi_states');
      applyData(row, args.data);
      return clone(row);
    },
    updateMany: async (args: { where: Where; data: Row }) => {
      checkArgs('galpiState.updateMany', args, ['where', 'data']);
      const rows = filterRows(this.galpiStates, args.where);
      rows.forEach((r) => applyData(r, args.data));
      return { count: rows.length };
    },
  };

  galpiMessage = {
    create: async (args: { data: Row }) => {
      checkArgs('galpiMessage.create', args, ['data']);
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
        ...args.data,
      };
      this.galpiMessages.push(row);
      return clone(row);
    },
    findMany: async (args: { where?: Where; orderBy?: Row; take?: number; select?: Row } = {}) => {
      checkArgs('galpiMessage.findMany', args, ['where', 'orderBy', 'take']);
      const take = checkTake('galpiMessage.findMany', args.take);
      const rows = sortRows(filterRows(this.galpiMessages, args.where), args.orderBy);
      return (take === undefined ? rows : rows.slice(0, take)).map(clone);
    },
    findFirst: async (args: { where?: Where; orderBy?: Row; select?: Row } = {}) => {
      checkArgs('galpiMessage.findFirst', args, ['where', 'orderBy']);
      const rows = sortRows(filterRows(this.galpiMessages, args.where), args.orderBy);
      return rows[0] ? clone(rows[0]) : null;
    },
    updateMany: async (args: { where: Where; data: Row }) => {
      checkArgs('galpiMessage.updateMany', args, ['where', 'data']);
      const rows = filterRows(this.galpiMessages, args.where);
      rows.forEach((r) => applyData(r, args.data));
      return { count: rows.length };
    },
    deleteMany: async (args: { where: Where }) => {
      checkArgs('galpiMessage.deleteMany', args, ['where']);
      const ids = new Set(filterRows(this.galpiMessages, args.where).map((m) => m.id));
      this.galpiMessages = this.galpiMessages.filter((m) => !ids.has(m.id));
      this.wikiClaimSources = this.wikiClaimSources.filter((s) => !ids.has(s.messageId));
      return { count: ids.size };
    },
  };

  wikiClaim = {
    findMany: async (args: { where?: Where; orderBy?: Row; include?: { sources?: boolean }; select?: Row } = {}) => {
      checkArgs('wikiClaim.findMany', args, ['where', 'orderBy', 'include']);
      const include = includesSources('wikiClaim.findMany', args.include);
      return sortRows(this.claimRows(args.where), args.orderBy).map((c) => this.withSources(c, include));
    },
    findFirst: async (args: { where?: Where; include?: { sources?: boolean } } = {}) => {
      checkArgs('wikiClaim.findFirst', args, ['where', 'include']);
      const include = includesSources('wikiClaim.findFirst', args.include);
      const claim = this.claimRows(args.where)[0];
      return claim ? this.withSources(claim, include) : null;
    },
    create: async (args: { data: Row }) => {
      checkArgs('wikiClaim.create', args, ['data']);
      const { sources, ...rest } = args.data;
      const { messageIds } = readSourceWrites(sources, false);
      const now = new Date();
      const row = { id: randomUUID(), createdAt: now, updatedAt: now, ...rest };
      this.wikiClaims.push(row);
      for (const messageId of messageIds) this.wikiClaimSources.push({ claimId: row.id, messageId });
      return clone(row);
    },
    update: async (args: { where: { id: string }; data: Row }) => {
      checkArgs('wikiClaim.update', args, ['where', 'data']);
      const { sources, ...rest } = args.data;
      const { deleteAll, messageIds } = readSourceWrites(sources, true);
      const row = this.wikiClaims.find((c) => c.id === args.where.id);
      if (!row) throw new Error('Record to update not found: wiki_claims');
      applyData(row, rest);
      if (deleteAll) this.wikiClaimSources = this.wikiClaimSources.filter((s) => s.claimId !== row.id);
      for (const messageId of messageIds) {
        if (this.wikiClaimSources.some((x) => x.claimId === row.id && x.messageId === messageId)) {
          throw new Error('Unique constraint failed on the fields: (`claim_id`,`message_id`)');
        }
        this.wikiClaimSources.push({ claimId: row.id, messageId });
      }
      return clone(row);
    },
    deleteMany: async (args: { where: Where }) => {
      checkArgs('wikiClaim.deleteMany', args, ['where']);
      const ids = new Set(this.claimRows(args.where).map((c) => c.id));
      this.wikiClaims = this.wikiClaims.filter((c) => !ids.has(c.id));
      this.wikiClaimSources = this.wikiClaimSources.filter((s) => !ids.has(s.claimId));
      return { count: ids.size };
    },
  };

  profileFact = {
    findMany: async (args: { where?: Where; select?: Row } = {}) => {
      checkArgs('profileFact.findMany', args, ['where']);
      return filterRows(this.profileFacts, args.where).map(clone);
    },
    upsert: async (args: { where: { userId_key: { userId: string; key: string } }; create: Row; update: Row }) => {
      checkArgs('profileFact.upsert', args, ['where', 'create', 'update']);
      const { userId, key } = args.where.userId_key;
      const row = this.profileFacts.find((f) => f.userId === userId && f.key === key);
      if (row) {
        applyData(row, args.update);
        return clone(row);
      }
      const now = new Date();
      const created = { id: randomUUID(), value: null, letterAllowed: null, verified: false, createdAt: now, updatedAt: now, ...args.create };
      this.profileFacts.push(created);
      return clone(created);
    },
  };

  selfReport = {
    count: async (args: { where?: Where } = {}) => {
      checkArgs('selfReport.count', args, ['where']);
      return filterRows(this.selfReports, args.where).length;
    },
    create: async (args: { data: Row }) => {
      checkArgs('selfReport.create', args, ['data']);
      const row = { id: randomUUID(), paid: false, createdAt: new Date(), ...args.data };
      this.selfReports.push(row);
      return clone(row);
    },
    findFirst: async (args: { where?: Where; orderBy?: Row } = {}) => {
      checkArgs('selfReport.findFirst', args, ['where', 'orderBy']);
      const rows = sortRows(filterRows(this.selfReports, args.where), args.orderBy);
      return rows[0] ? clone(rows[0]) : null;
    },
  };

  llmUsage = {
    create: async (args: { data: Row }) => {
      checkArgs('llmUsage.create', args, ['data']);
      const row = { id: randomUUID(), cachedInputTokens: 0, createdAt: new Date(), ...args.data };
      this.llmUsages.push(row);
      return clone(row);
    },
  };

  pushToken = {
    findUnique: async (args: { where: { userId: string } }) => {
      checkArgs('pushToken.findUnique', args, ['where']);
      return clone(this.pushTokens.find((t) => t.userId === args.where.userId) ?? null) as Row | null;
    },
    upsert: async (args: { where: { userId: string }; create: Row; update: Row }) => {
      checkArgs('pushToken.upsert', args, ['where', 'create', 'update']);
      const row = this.pushTokens.find((t) => t.userId === args.where.userId);
      if (row) {
        applyData(row, args.update);
        return clone(row);
      }
      const created = { updatedAt: new Date(), ...args.create };
      this.pushTokens.push(created);
      return clone(created);
    },
    deleteMany: async (args: { where: Where }) => {
      checkArgs('pushToken.deleteMany', args, ['where']);
      const doomed = filterRows(this.pushTokens, args.where);
      this.pushTokens = this.pushTokens.filter((t) => !doomed.includes(t));
      return { count: doomed.length };
    },
  };

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  /** 조건에 맞는 문장. 관계 필터는 sources: { none: {} } 하나만 흉내 낸다 */
  private claimRows(where: Where = {}): Row[] {
    const { sources, ...rest } = where;
    if (sources !== undefined) {
      const keys = isPlainObject(sources) ? Object.keys(sources) : [];
      if (keys.length !== 1 || keys[0] !== 'none' || !isPlainObject(sources.none) || Object.keys(sources.none).length > 0) {
        unsupported('relation filter on "sources" (only { none: {} } is supported)');
      }
    }
    return filterRows(this.wikiClaims, rest).filter((claim) => sources === undefined || !this.wikiClaimSources.some((s) => s.claimId === claim.id));
  }

  private withSources(claim: Row, include: boolean): Row {
    const row = clone(claim);
    if (include) row.sources = this.wikiClaimSources.filter((s) => s.claimId === claim.id).map(clone);
    return row;
  }
}
