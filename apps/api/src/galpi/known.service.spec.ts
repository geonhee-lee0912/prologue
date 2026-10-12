import { Logger } from '@nestjs/common';
import { MockLlmProvider } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { KnownService } from './known.service';
import { ReportService } from './report/report.service';
import { FakePrisma } from './testing/fake-prisma';
import { WikiService } from './wiki/wiki.service';

const NOW = new Date('2026-10-11T03:00:00Z');

async function setup(opts: { turns?: number; llm?: MockLlmProvider | { complete: () => Promise<never> } } = {}) {
  const db = new FakePrisma();
  db.addUser({ id: 'u1', displayName: '지은' });
  await db.galpiState.create({ data: { userId: 'u1', userTurns: opts.turns ?? 12 } });
  for (const page of ['now', 'now', 'people', 'people', 'relationship', 'relationship']) {
    await db.wikiClaim.create({ data: { userId: 'u1', page, text: `${page} 문장` } });
  }
  for (const [key, value] of [['smoking', 'no'], ['marriage_intent', 'yes']]) {
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key } }, create: { userId: 'u1', key, value }, update: {} });
  }
  const prisma = db as unknown as PrismaService;
  const llm = opts.llm ?? new MockLlmProvider({ respond: () => '{name}, 들려준 이야기를 읽었어요.' });
  const known = new KnownService(prisma, new WikiService(prisma), new ReportService(prisma, llm as MockLlmProvider));
  return { db, known };
}

describe('알게 된 순간 (스펙 5.4)', () => {
  // 로그가 테스트 출력에 섞이지 않게 막고, 무엇을 남겼는지 확인한다
  let log: MockInstance<Logger['log']>;
  let warn: MockInstance<Logger['warn']>;

  beforeEach(() => {
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    warn.mockRestore();
  });

  it('아직 모자라면 false 이고 리포트를 쓰지 않는다', async () => {
    const { db, known } = await setup({ turns: 5 });
    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(false);
    expect(db.galpiStates[0].knownAt).toBeNull();
    expect(db.selfReports).toHaveLength(0);
  });

  it('처음 알게 된 순간 표시하고 첫 리포트를 쓴다', async () => {
    const { db, known } = await setup();
    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(true);
    expect(db.galpiStates[0].knownAt).toEqual(NOW);
    expect(db.selfReports).toHaveLength(1);
  });

  it('이미 알게 됐으면 false', async () => {
    const { known } = await setup();
    await known.checkAndMarkKnown('u1', NOW);
    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(false);
  });

  it('두 곳에서 동시에 불러도 리포트는 한 번 (리뷰 4)', async () => {
    const { db, known } = await setup();
    const results = await Promise.all([known.checkAndMarkKnown('u1', NOW), known.checkAndMarkKnown('u1', NOW)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(db.selfReports).toHaveLength(1);
  });

  it('리포트를 못 쓰면 표시를 되돌려 다음에 다시 본다', async () => {
    const failing = { complete: () => Promise.reject(new Error('llm down')) };
    const { db, known } = await setup({ llm: failing });
    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('llm down');
    expect(db.galpiStates[0].knownAt).toBeNull();
  });

  it('LLM 이 빈 답을 내도 표시를 되돌리고, 다음에 다시 쓰면 리포트가 한 번 생긴다', async () => {
    const llm = new MockLlmProvider({ responses: ['', '{name}, 들려준 이야기를 읽었어요.'] });
    const { db, known } = await setup({ llm });
    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('first report is empty');
    expect(db.galpiStates[0].knownAt).toBeNull();
    expect(db.selfReports).toHaveLength(0);

    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(true);
    expect(db.selfReports).toHaveLength(1);
  });

  it('리포트를 못 써도 경고에는 사용자 ID 만 남기고 오류 내용은 쓰지 않는다 (CLAUDE.md 10.3)', async () => {
    const failing = { complete: () => Promise.reject(new Error('llm down')) };
    const { known } = await setup({ llm: failing });
    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('llm down');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('first report failed user=u1');
    const logged = JSON.stringify([...log.mock.calls, ...warn.mock.calls]);
    expect(logged).not.toContain('llm down');
    expect(logged).not.toContain('지은');
  });
});
