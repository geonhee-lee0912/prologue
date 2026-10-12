import { describe, expect, it } from 'vitest';
import { FakePrisma, matches } from './fake-prisma';

describe('matches', () => {
  it('같음·null·Date·in·lt·gt 를 본다', () => {
    const at = new Date('2026-10-11T00:00:00Z');
    const row = { a: 1, b: null, at };
    expect(matches(row, { a: 1, b: null })).toBe(true);
    expect(matches(row, { at: new Date('2026-10-11T00:00:00Z') })).toBe(true);
    expect(matches(row, { a: { in: [2, 1] } })).toBe(true);
    expect(matches(row, { at: { lt: new Date('2026-10-12T00:00:00Z') } })).toBe(true);
    expect(matches(row, { at: { gt: new Date('2026-10-12T00:00:00Z') } })).toBe(false);
    expect(matches(row, { b: { lt: 5 } })).toBe(false);
  });
});

describe('FakePrisma', () => {
  it('GalpiState 는 사용자마다 하나 — 두 번 만들면 실패한다', async () => {
    const db = new FakePrisma();
    await db.galpiState.create({ data: { userId: 'u1' } });
    await expect(db.galpiState.create({ data: { userId: 'u1' } })).rejects.toThrow('Unique');
  });

  it('조건부 updateMany 는 맞는 행만 바꾸고 수를 돌려준다', async () => {
    const db = new FakePrisma();
    await db.galpiState.create({ data: { userId: 'u1' } });
    const first = await db.galpiState.updateMany({ where: { userId: 'u1', knownAt: null }, data: { knownAt: new Date() } });
    const second = await db.galpiState.updateMany({ where: { userId: 'u1', knownAt: null }, data: { knownAt: new Date() } });
    expect([first.count, second.count]).toEqual([1, 0]);
  });

  it('increment·decrement 를 적용한다', async () => {
    const db = new FakePrisma();
    await db.galpiState.create({ data: { userId: 'u1' } });
    await db.galpiState.update({ where: { userId: 'u1' }, data: { userTurns: { increment: 2 } } });
    await db.galpiState.update({ where: { userId: 'u1' }, data: { userTurns: { decrement: 1 } } });
    expect(db.galpiStates[0].userTurns).toBe(1);
  });

  it('메시지를 지우면 그 메시지를 가리키는 출처도 지워진다', async () => {
    const db = new FakePrisma();
    const m = await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '산책해요' } });
    await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '걷는다', sources: { create: [{ messageId: m.id }] } } });
    await db.galpiMessage.deleteMany({ where: { id: { in: [m.id] }, userId: 'u1' } });
    expect(db.wikiClaimSources).toEqual([]);
  });

  it('출처 없는 문장만 골라 지운다', async () => {
    const db = new FakePrisma();
    const m = await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: 'x' } });
    await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '출처 있음', sources: { create: [{ messageId: m.id }] } } });
    await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '출처 없음' } });
    const { count } = await db.wikiClaim.deleteMany({ where: { userId: 'u1', sources: { none: {} } } });
    expect(count).toBe(1);
    expect(db.wikiClaims.map((c) => c.text)).toEqual(['출처 있음']);
  });

  it('profileFact.upsert 는 만들고 고친다', async () => {
    const db = new FakePrisma();
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key: 'company' } }, create: { userId: 'u1', key: 'company', value: 'A' }, update: { value: 'A' } });
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key: 'company' } }, create: { userId: 'u1', key: 'company' }, update: { letterAllowed: false } });
    expect(db.profileFacts).toHaveLength(1);
    expect(db.profileFacts[0]).toMatchObject({ value: 'A', letterAllowed: false });
  });

  it('사용자는 기본으로 본인인증과 갈피 동의를 마친 상태다', async () => {
    const db = new FakePrisma();
    db.addUser({ id: 'u1', displayName: '지은' });
    const user = await db.user.findUnique({ where: { id: 'u1' } });
    expect(user?.auth.identityVerified).toBe(true);
    expect(user?.profile.displayName).toBe('지은');
    expect(user?.consents.map((c: { consentType: string }) => c.consentType).sort()).toEqual(['cross_border_transfer', 'sensitive_info']);
  });
});

// 아래는 FakePrisma 가 흉내 내지 않는 질의를 조용히 넘기지 않고 던지게 한 뒤 더한 spec 이다 (Task 5 리뷰)

type Delegate = Record<string, (args: unknown) => Promise<unknown>>;

/** 일부러 흉내 내지 않는 모양을 넘기려고 타입을 풀고 'model.method' 이름으로 부른다 */
function run(db: FakePrisma, call: string, args: unknown): Promise<unknown> {
  const [model, method] = call.split('.');
  return (db as unknown as Record<string, Delegate>)[model][method](args);
}

const day = (d: number) => new Date(Date.UTC(2026, 9, d));

describe('matches — 한 칸의 연산자를 모두 적용한다', () => {
  it('gte 와 lt 를 함께 본다 — gte 는 경계를 포함하고 lt 는 뺀다', () => {
    const range = { at: { gte: day(10), lt: day(12) } };
    expect([9, 10, 11, 12].map((d) => matches({ at: day(d) }, range))).toEqual([false, true, true, false]);
  });

  it('gt 와 lte 를 함께 본다 — gt 는 경계를 빼고 lte 는 포함한다', () => {
    const range = { n: { gt: 1, lte: 3 } };
    expect([1, 2, 3, 4].map((n) => matches({ n }, range))).toEqual([false, true, true, false]);
  });

  it('in 과 lt 를 함께 본다 — 앞의 연산자가 뒤의 것을 가리지 않는다', () => {
    const filter = { n: { in: [1, 2, 5], lt: 3 } };
    expect([1, 2, 3, 5].map((n) => matches({ n }, filter))).toEqual([true, true, false, false]);
  });

  it('not 은 스칼라와 null 을 받고 다른 연산자와도 함께 본다', () => {
    expect(matches({ a: 'x' }, { a: { not: 'y' } })).toBe(true);
    expect(matches({ a: 'x' }, { a: { not: 'x' } })).toBe(false);
    expect(matches({ a: 'x' }, { a: { not: null } })).toBe(true);
    expect(matches({ a: null }, { a: { not: null } })).toBe(false);
    expect([1, 2, 3].map((n) => matches({ n }, { n: { not: 2, gte: 2 } }))).toEqual([false, false, true]);
  });

  it('null 값은 비교 연산자에 맞지 않는다', () => {
    expect(matches({ at: null }, { at: { lt: day(12) } })).toBe(false);
    expect(matches({ at: null }, { at: { gte: day(10), lt: day(12) } })).toBe(false);
  });

  it('undefined 인 연산자는 Prisma 처럼 없는 것으로 본다', () => {
    expect(matches({ n: 1 }, { n: { lt: undefined } })).toBe(true);
    expect(matches({ n: 1 }, { n: { lt: undefined, gte: 2 } })).toBe(false);
  });
});

describe('FakePrisma — 흉내 내지 않는 질의는 조용히 넘기지 않고 던진다', () => {
  async function claimWithSource() {
    const db = new FakePrisma();
    const m = await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: 'x' } });
    const claim = await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '처음', sources: { create: [{ messageId: m.id }] } } });
    return { db, m, claim };
  }

  it.each([
    ['contains', { content: { contains: 'x' } }],
    ['startsWith', { content: { startsWith: 'x' } }],
    ['notIn', { content: { notIn: ['x'] } }],
    ['has', { tags: { has: 'x' } }],
    ['equals', { content: { equals: 'x' } }],
  ])('모르는 연산자 %s 는 던진다', (op, where) => {
    expect(() => matches({ content: 'x', tags: [] }, where)).toThrow(new RegExp(`FakePrisma: unsupported .*"${op}"`));
  });

  it('앞 연산자에서 이미 틀려도 모르는 연산자는 던진다', () => {
    expect(() => matches({ n: 9 }, { n: { lt: 3, contains: 'x' } })).toThrow('unsupported');
  });

  it('중첩 not 객체는 던진다', () => {
    expect(() => matches({ n: 1 }, { n: { not: { in: [1] } } })).toThrow(/unsupported nested "not"/);
  });

  it.each(['OR', 'AND', 'NOT'])('%s 는 배열이든 객체든 던진다', (key) => {
    for (const value of [[{ n: 1 }], { n: 1 }]) {
      expect(() => matches({ n: 1 }, { [key]: value })).toThrow(new RegExp(`unsupported where key "${key}"`));
    }
  });

  it('칸 조건이 배열이면 던진다 — 빈 배열이 모든 행에 맞아 버리지 않는다', () => {
    expect(() => matches({ n: 1 }, { n: [] })).toThrow(/unsupported array filter on "n"/);
    expect(() => matches({ n: 1 }, { n: [1] })).toThrow(/unsupported array filter on "n"/);
  });

  it('연산자 값이 모양에 맞지 않으면 던진다', () => {
    expect(() => matches({ n: 1 }, { n: { in: 'x' } })).toThrow(/unsupported "in" operand on "n"/);
    expect(() => matches({ n: 1 }, { n: { lt: null } })).toThrow(/unsupported "lt" operand on "n"/);
    expect(() => matches({ n: 1 }, { n: { gte: { at: 1 } } })).toThrow(/unsupported "gte" operand on "n"/);
  });

  it('오류 메시지에는 연산자·칸 이름만 있고 값(본문·이름)은 없다', () => {
    let message = '';
    try {
      matches({ content: '지은' }, { content: { contains: '지은' } });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('contains');
    expect(message).not.toContain('지은');
  });

  it('행이 하나도 없어도 던진다 — 빈 표가 흉내 내지 않는 질의를 가리지 않는다', async () => {
    const db = new FakePrisma();
    await expect(db.galpiMessage.findMany({ where: { content: { contains: 'x' } } })).rejects.toThrow('unsupported');
    await expect(db.galpiMessage.deleteMany({ where: { OR: [{ userId: 'u1' }] } })).rejects.toThrow('unsupported');
    await expect(run(db, 'galpiMessage.findMany', { orderBy: [{ createdAt: 'asc' }] })).rejects.toThrow('unsupported');
  });

  it.each([
    ['some', { some: {} }],
    ['every', { every: {} }],
    ['조건이 있는 none', { none: { messageId: 'm1' } }],
    ['none 과 다른 키', { none: {}, some: {} }],
  ])('wikiClaim 의 sources: %s 는 던진다', async (_label, sources) => {
    const db = new FakePrisma();
    await expect(db.wikiClaim.findMany({ where: { sources } })).rejects.toThrow(/unsupported relation filter on "sources"/);
    await expect(db.wikiClaim.findFirst({ where: { sources } })).rejects.toThrow(/unsupported relation filter on "sources"/);
    await expect(db.wikiClaim.deleteMany({ where: { userId: 'u1', sources } })).rejects.toThrow(/unsupported relation filter on "sources"/);
  });

  it('sources: { some } 로 지우려 해도 아무것도 지우지 않고 던진다', async () => {
    const { db } = await claimWithSource();
    await expect(db.wikiClaim.deleteMany({ where: { userId: 'u1', sources: { some: { messageId: 'm1' } } } })).rejects.toThrow('unsupported');
    expect(db.wikiClaims).toHaveLength(1);
  });

  it('wikiClaim 이 아닌 곳의 관계 필터는 모르는 연산자로 던진다', async () => {
    const db = new FakePrisma();
    await expect(db.galpiMessage.findMany({ where: { sources: { none: {} } } })).rejects.toThrow(/unsupported filter operator "none" on "sources"/);
  });

  it('sources: { none: {} } 는 출처 없는 문장만 고른다', async () => {
    const { db } = await claimWithSource();
    await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '출처 없음' } });
    const found = await db.wikiClaim.findMany({ where: { userId: 'u1', sources: { none: {} } } });
    expect(found.map((c) => c.text)).toEqual(['출처 없음']);
  });

  it.each([
    ['galpiState.findMany', { take: 1 }],
    ['galpiState.findMany', { skip: 1 }],
    ['galpiState.findMany', { orderBy: { createdAt: 'asc' } }],
    ['profileFact.findMany', { take: 1 }],
    ['profileFact.findMany', { orderBy: { createdAt: 'asc' } }],
    ['wikiClaim.findMany', { take: 1 }],
    ['wikiClaim.findFirst', { orderBy: { createdAt: 'asc' } }],
    ['galpiMessage.findFirst', { take: 1 }],
    ['selfReport.count', { take: 1 }],
    ['galpiMessage.findMany', { skip: 1 }],
    ['galpiMessage.findMany', { cursor: { id: 'm1' } }],
    ['galpiMessage.findMany', { distinct: ['sender'] }],
    ['galpiMessage.findMany', { include: { claimSources: true } }],
  ])('%s 는 적용하지 않는 인자 %j 를 던진다', async (call, args) => {
    const db = new FakePrisma();
    const [name] = Object.keys(args);
    await expect(run(db, call, args)).rejects.toThrow(new RegExp(`unsupported argument "${name}" on ${call}`));
  });

  it.each([0, -1, 1.5, '2'])('galpiMessage.findMany 의 take %j 는 던진다', async (take) => {
    const db = new FakePrisma();
    await expect(run(db, 'galpiMessage.findMany', { take })).rejects.toThrow(/unsupported take on galpiMessage\.findMany/);
  });

  it('양수 take 와 한 키 orderBy 는 그대로 된다', async () => {
    const db = new FakePrisma();
    for (const [i, content] of ['첫째', '둘째', '셋째'].entries()) {
      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content, createdAt: new Date(Date.UTC(2026, 9, 11, 0, 0, i)) } });
    }
    const newest = await db.galpiMessage.findMany({ where: { userId: 'u1' }, orderBy: { createdAt: 'desc' }, take: 2 });
    expect(newest.map((m) => m.content)).toEqual(['셋째', '둘째']);
    const oldest = await db.galpiMessage.findFirst({ where: { userId: 'u1' }, orderBy: { createdAt: 'asc' } });
    expect(oldest?.content).toBe('첫째');
  });

  it.each([
    ['배열', [{ createdAt: 'asc' }]],
    ['키가 둘', { createdAt: 'asc', id: 'asc' }],
    ['키가 없음', {}],
    ['방향이 객체', { createdAt: { sort: 'desc' } }],
    ['방향이 모르는 값', { createdAt: 'descending' }],
  ])('orderBy %s 는 던진다', async (_label, orderBy) => {
    const db = new FakePrisma();
    await expect(run(db, 'galpiMessage.findMany', { orderBy })).rejects.toThrow(/unsupported orderBy/);
    await expect(run(db, 'selfReport.findFirst', { orderBy })).rejects.toThrow(/unsupported orderBy/);
    await expect(run(db, 'wikiClaim.findMany', { orderBy })).rejects.toThrow(/unsupported orderBy/);
  });

  it('undefined 인 인자는 넘기지 않은 것으로 본다 — Prisma 처럼', async () => {
    const db = new FakePrisma();
    await expect(run(db, 'galpiMessage.findMany', { where: undefined, take: undefined, skip: undefined, orderBy: undefined })).resolves.toEqual([]);
    await expect(run(db, 'galpiMessage.findFirst', { orderBy: { createdAt: 'desc', id: undefined } })).resolves.toBeNull();
  });

  it('select 는 무시하고 행 전체를 돌려준다', async () => {
    const db = new FakePrisma();
    await db.galpiState.create({ data: { userId: 'u1' } });
    const row = await run(db, 'galpiState.findUnique', { where: { userId: 'u1' }, select: { userTurns: true } });
    expect(row).toMatchObject({ userId: 'u1', userTurns: 0 });
  });

  it('include: { sources: true } 는 출처를 붙이고 다른 include 는 던진다', async () => {
    const { db, m, claim } = await claimWithSource();
    const found = await db.wikiClaim.findFirst({ where: { id: claim.id }, include: { sources: true } });
    expect(found?.sources).toEqual([{ claimId: claim.id, messageId: m.id }]);
    await expect(run(db, 'wikiClaim.findFirst', { include: { user: true } })).rejects.toThrow(/unsupported include "user"/);
    await expect(run(db, 'wikiClaim.findMany', { include: { sources: { where: { messageId: 'x' } } } })).rejects.toThrow(/unsupported include "sources"/);
    await expect(run(db, 'wikiClaim.findMany', { include: true })).rejects.toThrow(/unsupported include on wikiClaim\.findMany/);
  });

  describe('중첩 sources 쓰기는 create 와 빈 deleteMany 만 받는다', () => {
    it.each([
      ['set', { set: [] }],
      ['connect', { connect: [{ claimId: 'c', messageId: 'm' }] }],
      ['createMany', { createMany: { data: [{ messageId: 'm' }] } }],
      ['update', { update: [] }],
      ['조건이 있는 deleteMany', { deleteMany: { messageId: 'other' } }],
    ])('update 의 %s 는 던지고 아무것도 바꾸지 않는다', async (_label, sources) => {
      const { db, claim } = await claimWithSource();
      await expect(db.wikiClaim.update({ where: { id: claim.id }, data: { text: '바뀜', sources } })).rejects.toThrow(/unsupported nested "sources/);
      expect(db.wikiClaims[0].text).toBe('처음');
      expect(db.wikiClaimSources).toHaveLength(1);
    });

    it('create 에는 deleteMany·connect 도 못 쓴다', async () => {
      const db = new FakePrisma();
      await expect(db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: 'a', sources: { deleteMany: {} } } })).rejects.toThrow(/unsupported nested "sources"/);
      await expect(db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: 'a', sources: { connect: [] } } })).rejects.toThrow(/unsupported nested "sources"/);
      expect(db.wikiClaims).toEqual([]);
    });

    it('sources 가 객체가 아니면 던진다', async () => {
      const db = new FakePrisma();
      for (const sources of ['x', null, [{ messageId: 'm1' }]]) {
        await expect(db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: 'a', sources } })).rejects.toThrow(/unsupported nested "sources" write/);
      }
      expect(db.wikiClaims).toEqual([]);
    });

    it('create 항목은 { messageId } 만 받는다 — 출처를 잃은 채 저장되지 않는다', async () => {
      const db = new FakePrisma();
      const bad = { message: { connect: { id: 'm1' } } };
      await expect(db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: 'a', sources: { create: [{ messageId: 'm1', extra: true }] } } })).rejects.toThrow(/unsupported nested "sources\.create" item/);
      await expect(db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: 'a', sources: { create: [bad] } } })).rejects.toThrow(/unsupported nested "sources\.create" item/);
      await expect(db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: 'a', sources: { create: [{ messageId: undefined }] } } })).rejects.toThrow(/unsupported nested "sources\.create" item/);
      await expect(db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: 'a', sources: { create: { messageId: 'm1' } } } })).rejects.toThrow(/unsupported nested "sources\.create"/);
      expect(db.wikiClaims).toEqual([]);
      expect(db.wikiClaimSources).toEqual([]);
    });

    it('빈 deleteMany 와 create 는 출처를 통째로 바꾼다', async () => {
      const { db, claim } = await claimWithSource();
      const next = await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: 'y' } });
      await db.wikiClaim.update({ where: { id: claim.id }, data: { sources: { deleteMany: {}, create: [{ messageId: next.id }] } } });
      expect(db.wikiClaimSources).toEqual([{ claimId: claim.id, messageId: next.id }]);
    });
  });
});

// 흉내 내는 모양(계획의 뒤 작업이 보내는 질의)이 막히지 않았는지 — 위 spec 의 반대쪽
describe('FakePrisma — 흉내 내는 질의는 그대로 된다', () => {
  it('날짜 조건·조건부 갱신: null 은 lt 에 맞지 않고, 먼저 차지한 요청만 갱신한다', async () => {
    const db = new FakePrisma();
    await db.galpiState.create({ data: { userId: 'u1', lastUserMessageAt: day(1) } });
    await db.galpiState.create({ data: { userId: 'u2', lastUserMessageAt: day(20) } });
    await db.galpiState.create({ data: { userId: 'u3' } });
    const idle = await db.galpiState.findMany({ where: { lastUserMessageAt: { lt: day(10) } } });
    expect(idle.map((s) => s.userId)).toEqual(['u1']);

    const m = await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '물어볼게요' } });
    const claim = (key: string) => db.galpiMessage.updateMany({ where: { id: m.id, userId: 'u1', answeredKey: null }, data: { answeredKey: key } });
    expect([(await claim('a')).count, (await claim('b')).count]).toEqual([1, 0]);
    expect(db.galpiMessages[0].answeredKey).toBe('a');
  });

  it('selfReport: 개수·만들기·가장 새 것', async () => {
    const db = new FakePrisma();
    expect(await db.selfReport.count({ where: { userId: 'u1' } })).toBe(0);
    await db.selfReport.create({ data: { userId: 'u1', body: '첫 편지', createdAt: day(1) } });
    await db.selfReport.create({ data: { userId: 'u1', body: '둘째 편지', createdAt: day(2) } });
    expect(await db.selfReport.count({ where: { userId: 'u1' } })).toBe(2);
    const latest = await db.selfReport.findFirst({ where: { userId: 'u1' }, orderBy: { createdAt: 'desc' } });
    expect(latest?.body).toBe('둘째 편지');
  });

  it('profileFact.findMany 는 select 를 무시하고 사용자의 칸만 돌려준다', async () => {
    const db = new FakePrisma();
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key: 'company' } }, create: { userId: 'u1', key: 'company', value: 'A사' }, update: {} });
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u2', key: 'company' } }, create: { userId: 'u2', key: 'company', value: 'B사' }, update: {} });
    const facts = await db.profileFact.findMany({ where: { userId: 'u1' }, select: { key: true, value: true } });
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({ key: 'company', value: 'A사' });
  });

  it('pushToken: 만들고 고치고, 같은 토큰을 가진 다른 사람의 것만 지운다', async () => {
    const db = new FakePrisma();
    await db.pushToken.upsert({ where: { userId: 'u1' }, create: { userId: 'u1', token: 't1' }, update: { token: 't1' } });
    await db.pushToken.upsert({ where: { userId: 'u2' }, create: { userId: 'u2', token: 't2' }, update: { token: 't2' } });
    await db.pushToken.upsert({ where: { userId: 'u2' }, create: { userId: 'u2', token: 't1' }, update: { token: 't1' } });
    expect(await db.pushToken.findUnique({ where: { userId: 'u2' } })).toMatchObject({ token: 't1' });
    const removed = await db.pushToken.deleteMany({ where: { token: 't1', userId: { not: 'u2' } } });
    expect(removed.count).toBe(1);
    expect(db.pushTokens.map((t) => t.userId)).toEqual(['u2']);
    expect((await db.pushToken.deleteMany({ where: { userId: 'u2' } })).count).toBe(1);
    expect(db.pushTokens).toEqual([]);
  });

  it('llmUsage.create 는 기본값을 채운다', async () => {
    const db = new FakePrisma();
    await db.llmUsage.create({ data: { userId: null, purpose: 'reply', inputTokens: 10, outputTokens: 5 } });
    expect(db.llmUsages[0]).toMatchObject({ userId: null, purpose: 'reply', cachedInputTokens: 0 });
  });
});
