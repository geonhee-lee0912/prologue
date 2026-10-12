import { ErrorCode } from '@prologue/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { FakePrisma } from '../testing/fake-prisma';
import { WikiService } from './wiki.service';

describe('서고', () => {
  let db: FakePrisma;
  let wiki: WikiService;
  let m1: string;
  let m2: string;
  const claims: Record<string, string> = {};

  beforeEach(async () => {
    db = new FakePrisma();
    wiki = new WikiService(db as unknown as PrismaService);
    m1 = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '퇴근하고 걸어요', createdAt: new Date('2026-10-11T01:00:00Z') } })).id;
    m2 = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '친구들이 차분하대요', createdAt: new Date('2026-10-11T01:01:00Z') } })).id;
    const add = async (key: string, page: string, text: string, sources: string[], at: number) => {
      const row = await db.wikiClaim.create({
        data: { userId: 'u1', page, text, createdAt: new Date(at), sources: { create: sources.map((messageId) => ({ messageId })) } },
      });
      claims[key] = row.id;
    };
    await add('c1', 'now', '퇴근 뒤에는 혼자 걷는다', [m1], 1);
    await add('c2', 'people', '산책을 같이 하는 친구가 있다', [m1], 2);
    await add('c3', 'relationship', '조용히 곁에 있는 사람이 편하다', [m1, m2], 3);
    await add('c4', 'attraction', '차분한 분위기에 끌린다', [m2], 4);
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key: 'company' } }, create: { userId: 'u1', key: 'company', value: 'A사' }, update: {} });
  });

  it('snapshot 은 장별 문장과 구조화 칸을 모은다', async () => {
    const snap = await wiki.snapshot('u1');
    expect(snap.pages.now.map((c) => c.text)).toEqual(['퇴근 뒤에는 혼자 걷는다']);
    expect(snap.pages.attraction).toHaveLength(1);
    expect(snap.pages.met).toEqual([]);
    expect(snap.facts.company).toEqual({ value: 'A사', letterAllowed: null });
  });

  it('갈피가 기억하는 것에는 AI 만 보는 장이 나오지 않는다 (스펙 3.3)', async () => {
    const memories = await wiki.listVisible('u1');
    expect(memories.map((m) => m.page)).toEqual(['now', 'people', 'relationship']);
    expect(memories[0]).toEqual({ id: claims.c1, page: 'now', pageTitle: '요즘의 나', text: '퇴근 뒤에는 혼자 걷는다' });
  });

  it('갈피 빼기는 문장과 출처 원문을 지우고, 그 원문에서만 나온 문장도 함께 지운다 (리뷰 5)', async () => {
    await wiki.removeClaim('u1', claims.c1);
    expect(db.wikiClaims.map((c) => c.id).sort()).toEqual([claims.c3, claims.c4].sort());
    expect(db.galpiMessages.map((m) => m.id)).toEqual([m2]);
    // c3 은 m2 출처가 남아 산다
    expect(db.wikiClaimSources).toEqual(expect.arrayContaining([{ claimId: claims.c3, messageId: m2 }]));
  });

  it('다른 사람의 문장이나 AI 만 보는 장의 문장은 뺄 수 없다', async () => {
    await expect(wiki.removeClaim('u2', claims.c1)).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    await expect(wiki.removeClaim('u1', claims.c4)).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    expect(db.wikiClaims).toHaveLength(4);
  });

  it('빼기 뒤의 정리는 요청한 사람의 서고만 훑는다 — 출처가 없는 남의 문장은 그대로 둔다', async () => {
    const other = (await db.galpiMessage.create({ data: { userId: 'u2', sender: 'user', content: '주말엔 쉬어요' } })).id;
    await db.wikiClaim.create({ data: { userId: 'u2', page: 'now', text: '주말에는 쉰다', sources: { create: [{ messageId: other }] } } });
    await db.wikiClaim.create({ data: { userId: 'u2', page: 'people', text: '출처가 비어 있는 문장' } });

    await wiki.removeClaim('u1', claims.c1);

    expect(db.wikiClaims.filter((c) => c.userId === 'u2')).toHaveLength(2);
    expect(db.galpiMessages.filter((m) => m.userId === 'u2').map((m) => m.id)).toEqual([other]);
    expect(db.wikiClaims.filter((c) => c.userId === 'u1').map((c) => c.id).sort()).toEqual([claims.c3, claims.c4].sort());
  });
});
