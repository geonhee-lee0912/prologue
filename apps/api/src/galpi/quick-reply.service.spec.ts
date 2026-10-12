import { HttpStatus, Logger } from '@nestjs/common';
import { ErrorCode, GALPI_COPY } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { GalpiAccessService } from './access.service';
import type { KnownService } from './known.service';
import { QuickReplyService } from './quick-reply.service';
import { FakePrisma, type FakeUserInput } from './testing/fake-prisma';

const NOW = new Date('2026-10-11T03:00:00Z');

async function setup(user: Partial<FakeUserInput> = {}) {
  const db = new FakePrisma();
  db.addUser({ id: 'u1', displayName: '지은', ...user });
  db.addUser({ id: 'u2' });
  await db.galpiState.create({ data: { userId: 'u1', userTurns: 5, unansweredProactive: 1 } });
  const known = { checkAndMarkKnown: vi.fn().mockResolvedValue(false) };
  const prisma = db as unknown as PrismaService;
  const service = new QuickReplyService(prisma, new GalpiAccessService(prisma), known as unknown as KnownService);
  const ask = async (quickReply: Record<string, string>, userId = 'u1') =>
    (await db.galpiMessage.create({ data: { userId, sender: 'galpi', content: '물어볼게요', quickReply, createdAt: new Date(NOW.getTime() - 60_000) } })).id;
  return { db, known, service, ask };
}

/**
 * FakePrisma 의 $transaction 은 되돌리지 않는다. 진짜 DB 처럼 — 안에서는 복사본에 쓰고, 끝까지 가면 반영하고, 던지면 버린다.
 * 콜백에 넘긴 tx 가 아닌 바깥 클라이언트로 쓴 것은 트랜잭션에 묶이지 않는다. 호출이 하나일 때만 쓴다(행 잠금은 흉내 내지 않는다)
 * (known.service.spec.ts 의 같은 이름 도우미와 같다)
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

describe('버튼 답 (스펙 5.2·5.3)', () => {
  it('조건 정보를 편지에 적어도 된다고 하면 허락을 남기고, 내 답과 갈피 답을 돌려준다', async () => {
    const { db, service, ask } = await setup();
    const id = await ask({ type: 'condition_permission', fact: 'company' });
    const result = await service.answer('u1', id, 'allow', NOW);
    expect(result.messages.map((m) => [m.from, m.text])).toEqual([
      ['me', '적어도 돼요'],
      ['galpi', GALPI_COPY.conditionAck.allow],
    ]);
    // 값은 아직 몰라도 된다 — 서고 수집이 나중에 채운다
    expect(db.profileFacts[0]).toMatchObject({ userId: 'u1', key: 'company', value: null, letterAllowed: true });
    expect(db.galpiMessages.find((m) => m.id === id)?.answeredKey).toBe('allow');
  });

  it('서고에만 두겠다고 하면 편지에 적지 않고, 값은 그대로 둔다 (하드룰 8)', async () => {
    const { db, service, ask } = await setup();
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key: 'company' } }, create: { userId: 'u1', key: 'company', value: 'A사' }, update: {} });
    const id = await ask({ type: 'condition_permission', fact: 'company' });
    const result = await service.answer('u1', id, 'deny', NOW);
    expect(result.messages[1].text).toBe(GALPI_COPY.conditionAck.deny);
    expect(db.profileFacts[0]).toMatchObject({ value: 'A사', letterAllowed: false });
  });

  it('실용 정보를 남기고 알게 됨을 확인한다', async () => {
    const { db, known, service, ask } = await setup();
    const id = await ask({ type: 'practical', fact: 'smoking' });
    const result = await service.answer('u1', id, 'no', NOW);
    expect(result.messages.map((m) => m.text)).toEqual(['안 피워요', GALPI_COPY.practicalAck]);
    expect(db.profileFacts[0]).toMatchObject({ key: 'smoking', value: 'no' });
    expect(known.checkAndMarkKnown).toHaveBeenCalledWith('u1', NOW);
  });

  it('말을 놓자고 하면 반말로 바꾸고, 지금이 좋다고 하면 그대로 둔다', async () => {
    const first = await setup();
    const id = await first.ask({ type: 'speech_level' });
    expect((await first.service.answer('u1', id, 'casual', NOW)).messages[1].text).toBe(GALPI_COPY.speechAck.casual);
    expect(first.db.galpiStates[0].speechLevel).toBe('casual');

    const second = await setup();
    const id2 = await second.ask({ type: 'speech_level' });
    expect((await second.service.answer('u1', id2, 'keep', NOW)).messages[1].text).toBe(GALPI_COPY.speechAck.keep);
    expect(second.db.galpiStates[0].speechLevel).toBe('mixed');
  });

  it('버튼 답은 턴으로 세지 않지만, 돌아온 것으로 본다 (스펙 5.4·7장)', async () => {
    const { db, service, ask } = await setup();
    const id = await ask({ type: 'practical', fact: 'smoking' });
    await service.answer('u1', id, 'no', NOW);
    expect(db.galpiStates[0]).toMatchObject({ userTurns: 5, unansweredProactive: 0, lastUserMessageAt: NOW });
  });

  it('없는 선택지, 버튼 없는 말, 다른 사람의 말에는 답할 수 없다', async () => {
    const { db, service, ask } = await setup();
    const id = await ask({ type: 'practical', fact: 'smoking' });
    await expect(service.answer('u1', id, 'maybe', NOW)).rejects.toMatchObject({ code: ErrorCode.QUICK_REPLY_INVALID });
    const plain = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '그렇구나' } })).id;
    await expect(service.answer('u1', plain, 'no', NOW)).rejects.toMatchObject({ code: ErrorCode.QUICK_REPLY_INVALID });
    const others = await ask({ type: 'practical', fact: 'smoking' }, 'u2');
    await expect(service.answer('u1', others, 'no', NOW)).rejects.toMatchObject({ code: ErrorCode.QUICK_REPLY_INVALID });
    expect(db.profileFacts).toHaveLength(0);
  });

  it('이미 답한 버튼에 다시 답하면 409 이고 아무것도 바뀌지 않는다 (리뷰 2)', async () => {
    const { db, service, ask } = await setup();
    const id = await ask({ type: 'practical', fact: 'smoking' });
    await service.answer('u1', id, 'no', NOW);
    await expect(service.answer('u1', id, 'yes', NOW)).rejects.toMatchObject({
      code: ErrorCode.QUICK_REPLY_INVALID,
      status: HttpStatus.CONFLICT,
    });
    expect(db.profileFacts[0].value).toBe('no');
    expect(db.galpiMessages).toHaveLength(3);
  });

  it('동시에 두 번 눌러도 한 번만 받는다 (리뷰 2)', async () => {
    const { db, service, ask } = await setup();
    const id = await ask({ type: 'practical', fact: 'smoking' });
    const results = await Promise.allSettled([service.answer('u1', id, 'no', NOW), service.answer('u1', id, 'yes', NOW)]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(db.profileFacts).toHaveLength(1);
    expect(db.galpiMessages).toHaveLength(3);
  });

  it('동의가 없으면 답할 수 없다', async () => {
    const { service, ask } = await setup({ consents: [] });
    const id = await ask({ type: 'practical', fact: 'smoking' });
    await expect(service.answer('u1', id, 'no', NOW)).rejects.toMatchObject({ code: ErrorCode.AI_CONSENT_REQUIRED });
  });
});

describe('버튼 답 — 한꺼번에 적고, 알게 됨 확인을 기다리지 않는다 (리뷰 2)', () => {
  // 알게 됨 확인이 실패하는 시험은 경고 로그를 남긴다 — 출력에 섞이지 않게 막고, 무엇을 남겼는지 확인한다
  let warn: MockInstance<Logger['warn']>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('차지한 것, 남긴 사실, 내 답, 상태, 갈피의 답은 한 트랜잭션이다 — 도중에 실패하면 모두 되돌아가고, 다시 눌러 답할 수 있다', async () => {
    const { db, known, service, ask } = await setup();
    const id = await ask({ type: 'practical', fact: 'smoking' });
    realTransactions(db, (tx) => {
      // 마지막 단계(갈피의 답)에서 실패한다 — 앞의 쓰기가 하나라도 트랜잭션 밖이면 남는다
      const create = tx.galpiMessage.create;
      let calls = 0;
      tx.galpiMessage.create = async (args) => {
        calls += 1;
        if (calls === 2) throw new Error('db down');
        return create(args);
      };
    });

    await expect(service.answer('u1', id, 'no', NOW)).rejects.toThrow('db down');
    expect(db.galpiMessages).toHaveLength(1);
    expect(db.galpiMessages[0].answeredKey).toBeNull();
    expect(db.profileFacts).toHaveLength(0);
    expect(db.galpiStates[0]).toMatchObject({ unansweredProactive: 1, lastUserMessageAt: null });
    // 적히지 않은 답에 알게 됨을 보지 않는다
    expect(known.checkAndMarkKnown).not.toHaveBeenCalled();

    realTransactions(db, () => undefined);
    const retry = await service.answer('u1', id, 'no', NOW);
    expect(retry.messages.map((m) => m.text)).toEqual(['안 피워요', GALPI_COPY.practicalAck]);
    expect(db.galpiMessages).toHaveLength(3);
    expect(db.profileFacts).toMatchObject([{ key: 'smoking', value: 'no' }]);
  });

  it('내 답은 now, 갈피의 답은 now+1 에 놓인다 — 첫 리포트 알림(now+2)이 그 뒤에 온다', async () => {
    const { service, ask } = await setup();
    const id = await ask({ type: 'practical', fact: 'smoking' });
    const result = await service.answer('u1', id, 'no', NOW);
    expect(result.messages.map((m) => m.at)).toEqual([NOW.toISOString(), new Date(NOW.getTime() + 1).toISOString()]);
  });

  it('실용 정보가 아닌 버튼 답은 알게 됨을 다시 보지 않는다', async () => {
    const { known, service, ask } = await setup();
    await service.answer('u1', await ask({ type: 'condition_permission', fact: 'company' }), 'allow', NOW);
    await service.answer('u1', await ask({ type: 'speech_level' }), 'keep', NOW);
    expect(known.checkAndMarkKnown).not.toHaveBeenCalled();
  });

  it('알게 됨 확인이 끝나기를 기다리지 않는다 — 첫 리포트는 오래 걸린다', async () => {
    const { known, service, ask } = await setup();
    // 끝나지 않는 확인. 기다린다면 이 시험은 끝나지 않는다
    known.checkAndMarkKnown.mockReturnValue(new Promise(() => undefined));
    const id = await ask({ type: 'practical', fact: 'smoking' });
    const result = await service.answer('u1', id, 'no', NOW);
    expect(result.messages.map((m) => m.text)).toEqual(['안 피워요', GALPI_COPY.practicalAck]);
  });

  it('알게 됨 확인이 실패해도 답은 그대로 돌려주고, 로그에는 사용자 ID 만 남긴다', async () => {
    const { db, known, service, ask } = await setup();
    known.checkAndMarkKnown.mockRejectedValue(new Error('지은의 연봉 편지'));
    const id = await ask({ type: 'practical', fact: 'smoking' });
    const result = await service.answer('u1', id, 'no', NOW);
    expect(result.messages.map((m) => m.text)).toEqual(['안 피워요', GALPI_COPY.practicalAck]);
    expect(db.profileFacts).toMatchObject([{ key: 'smoking', value: 'no' }]);
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(warn.mock.calls[0]).toEqual(['known check failed user=u1']);
  });
});
