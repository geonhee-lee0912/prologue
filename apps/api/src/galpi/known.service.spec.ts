import { Logger } from '@nestjs/common';
import { type LlmCompletionResult, type LlmProvider, MockLlmProvider } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { KnownService } from './known.service';
import { ReportService } from './report/report.service';
import { FakePrisma } from './testing/fake-prisma';
import { WikiService } from './wiki/wiki.service';

const NOW = new Date('2026-10-11T03:00:00Z');
const LETTER = '{name}, 들려준 이야기를 읽었어요.';

async function setup(opts: { turns?: number; llm?: LlmProvider } = {}) {
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
  const llm = opts.llm ?? new MockLlmProvider({ respond: () => LETTER });
  const known = new KnownService(prisma, new WikiService(prisma), new ReportService(prisma, llm));
  return { db, known };
}

/**
 * FakePrisma 의 $transaction 은 되돌리지 않는다. 진짜 DB 처럼 — 안에서는 복사본에 쓰고, 끝까지 가면 반영하고, 던지면 버린다.
 * 콜백에 넘긴 tx 가 아닌 바깥 클라이언트로 쓴 것은 트랜잭션에 묶이지 않는다. 호출이 하나일 때만 쓴다(행 잠금은 흉내 내지 않는다)
 */
function realTransactions(db: FakePrisma, patch: (tx: FakePrisma) => void): void {
  db.$transaction = async (fn) => {
    const tx = new FakePrisma();
    const copy = tx as unknown as Record<string, unknown>;
    for (const [key, rows] of Object.entries(db)) if (Array.isArray(rows)) copy[key] = structuredClone(rows);
    patch(tx);
    const result = await fn(tx);
    for (const [key, rows] of Object.entries(copy)) if (Array.isArray(rows)) (db as unknown as Record<string, unknown>)[key] = rows;
    return result;
  };
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

  it('아직 모자라면 false 이고 편지도 리포트도 쓰지 않는다', async () => {
    const llm = new MockLlmProvider({ respond: () => LETTER });
    const { db, known } = await setup({ turns: 5, llm });
    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(false);
    expect(db.galpiStates[0].knownAt).toBeNull();
    expect(db.selfReports).toHaveLength(0);
    expect(llm.calls).toHaveLength(0);
  });

  it('처음 알게 된 순간 표시하고 첫 리포트를 쓰고 알린다', async () => {
    const { db, known } = await setup();
    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(true);
    expect(db.galpiStates[0].knownAt).toEqual(NOW);
    expect(db.selfReports).toHaveLength(1);
    // 이모티콘과 안내 두 줄
    expect(db.galpiMessages).toHaveLength(2);
  });

  it('이미 알게 됐으면 false 이고 편지를 다시 쓰지 않는다', async () => {
    const llm = new MockLlmProvider({ respond: () => LETTER });
    const { db, known } = await setup({ llm });
    await known.checkAndMarkKnown('u1', NOW);
    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(false);
    expect(llm.calls).toHaveLength(1);
    expect(db.selfReports).toHaveLength(1);
  });

  it('두 곳에서 동시에 불러도 리포트는 한 번 — 둘 다 편지를 쓸 수 있지만 저장은 먼저 차지한 쪽만 (리뷰 4)', async () => {
    const { db, known } = await setup();
    const results = await Promise.all([known.checkAndMarkKnown('u1', NOW), known.checkAndMarkKnown('u1', NOW)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(db.selfReports).toHaveLength(1);
    expect(db.galpiMessages).toHaveLength(2);
    // 저장한 쪽만 기록을 남긴다
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('편지를 못 쓰면 아무것도 적지 않으니 다음에 다시 보고, 그때는 리포트가 한 번 생긴다', async () => {
    let down = true;
    const inner = new MockLlmProvider({ respond: () => LETTER });
    const flaky: LlmProvider = { complete: (request) => (down ? Promise.reject(new Error('llm down')) : inner.complete(request)) };
    const { db, known } = await setup({ llm: flaky });

    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('llm down');
    expect(db.galpiStates[0].knownAt).toBeNull();
    expect(db.selfReports).toHaveLength(0);
    expect(db.galpiMessages).toHaveLength(0);

    down = false;
    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(true);
    expect(db.selfReports).toHaveLength(1);
  });

  it('LLM 이 빈 답이나 호칭뿐인 답을 내도 아무것도 적지 않고, 제대로 된 편지가 나오면 리포트가 한 번 생긴다', async () => {
    const llm = new MockLlmProvider({ responses: ['', '{name},', LETTER] });
    const { db, known } = await setup({ llm });

    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('first report is empty');
    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('first report is empty');
    expect(db.galpiStates[0].knownAt).toBeNull();
    expect(db.selfReports).toHaveLength(0);
    expect(db.galpiMessages).toHaveLength(0);

    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(true);
    expect(db.selfReports).toHaveLength(1);
  });

  it('편지를 쓰는 동안(LLM 을 기다리는 동안)에는 아무것도 적지 않는다 — 그 사이 프로세스가 죽어도 남는 것이 없다', async () => {
    let calls = 0;
    let release: (content: string) => void = () => undefined;
    const slow: LlmProvider = {
      complete() {
        calls += 1;
        return new Promise<LlmCompletionResult>((resolve) => {
          release = (content) => resolve({ content, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 });
        });
      },
    };
    const { db, known } = await setup({ llm: slow });

    const pending = known.checkAndMarkKnown('u1', NOW);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 편지를 쓰는 중이다 — 아직 알게 됨 표시도 리포트도 알림도 없다
    expect(calls).toBe(1);
    expect(db.galpiStates[0].knownAt).toBeNull();
    expect(db.selfReports).toHaveLength(0);
    expect(db.galpiMessages).toHaveLength(0);

    release(LETTER);
    expect(await pending).toBe(true);
    expect(db.galpiStates[0].knownAt).toEqual(NOW);
    expect(db.selfReports).toHaveLength(1);
  });

  it('알게 됨 표시와 리포트·알림은 한 트랜잭션이다 — 저장하다 실패하면 표시도 리포트도 남지 않고, 다음에 다시 보면 한 번 생긴다', async () => {
    const { db, known } = await setup();
    let failures = 1;
    realTransactions(db, (tx) => {
      const create = tx.galpiMessage.create;
      tx.galpiMessage.create = async (args) => {
        // 리포트 행을 넣은 뒤 알림을 넣다가 실패한다
        if (failures-- > 0) throw new Error('db down');
        return create(args);
      };
    });

    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('db down');
    expect(db.galpiStates[0].knownAt).toBeNull();
    expect(db.selfReports).toHaveLength(0);
    expect(db.galpiMessages).toHaveLength(0);

    expect(await known.checkAndMarkKnown('u1', NOW)).toBe(true);
    expect(db.galpiStates[0].knownAt).toEqual(NOW);
    expect(db.selfReports).toHaveLength(1);
    expect(db.galpiMessages).toHaveLength(2);
  });

  it('로그에는 사용자 ID 만 남기고 편지 본문은 쓰지 않는다 (CLAUDE.md 10.3)', async () => {
    const { known } = await setup({ llm: new MockLlmProvider({ respond: () => '{name}, 퇴근 뒤에 혼자 걷는 사람이에요.' }) });
    await known.checkAndMarkKnown('u1', NOW);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('first report written user=u1');
    const logged = JSON.stringify([...log.mock.calls, ...warn.mock.calls]);
    expect(logged).not.toContain('걷는');
    expect(logged).not.toContain('지은');
  });

  it('리포트를 못 써도 경고에는 사용자 ID 만 남기고 오류 내용은 쓰지 않는다 (CLAUDE.md 10.3)', async () => {
    const failing: LlmProvider = { complete: () => Promise.reject(new Error('llm down')) };
    const { known } = await setup({ llm: failing });
    await expect(known.checkAndMarkKnown('u1', NOW)).rejects.toThrow('llm down');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('first report failed user=u1');
    const logged = JSON.stringify([...log.mock.calls, ...warn.mock.calls]);
    expect(logged).not.toContain('llm down');
    expect(logged).not.toContain('지은');
  });
});
