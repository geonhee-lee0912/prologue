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
