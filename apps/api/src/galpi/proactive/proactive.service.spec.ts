import { Logger } from '@nestjs/common';
import { type LlmProvider, MockLlmProvider, POLICY, type PushMessage, type PushProvider, type PushSendResult } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { GalpiAccessService } from '../access.service';
import { FakePrisma, type FakeUserInput } from '../testing/fake-prisma';
import { WikiService } from '../wiki/wiki.service';
import { ProactiveService } from './proactive.service';

/** 한국 시간 2026-10-(day) h시 */
const kst = (h: number, m = 0, day = 12) => new Date(Date.UTC(2026, 9, day, h - 9, m));
const NOW = kst(20);

// 실패 경로는 경고 로그를 남긴다 — 테스트 출력에 섞이지 않게 막고, 무엇을 남겼는지 확인한다
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

/** 갈피가 버튼까지 건네도 먼저 말 걸기에는 버튼이 붙지 않는다 */
function reply(text: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    messages: [{ text, expression: 'wave' }],
    quickReply: { type: 'practical', fact: 'smoking' },
    signals: { userUsedCasual: false, crisis: 'none' },
    ...extra,
  });
}

class RecordingPush implements PushProvider {
  readonly sent: PushMessage[] = [];
  fail = false;

  async send(message: PushMessage): Promise<PushSendResult> {
    if (this.fail) throw new Error('push down');
    this.sent.push(message);
    return { id: 'p1', status: 'ok' };
  }
}

async function setup(opts: { user?: Partial<FakeUserInput>; responses?: string[] } = {}) {
  const db = new FakePrisma();
  db.addUser({ id: 'u1', displayName: '지은', ...opts.user });
  await db.galpiState.create({ data: { userId: 'u1', firstMeetingAt: kst(10, 0, 10), lastUserMessageAt: kst(20, 30, 11) } });
  // 어제 저녁 8시대에 이야기했다 → 주로 대화하던 시각은 20시
  await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '저는 지은이고 금요일에 발표가 있어요', createdAt: kst(20, 30, 11) } });
  await db.wikiClaim.create({ data: { userId: 'u1', page: 'next_topics', text: '금요일에 발표가 있다' } });
  await db.pushToken.upsert({ where: { userId: 'u1' }, create: { userId: 'u1', token: 'ExponentPushToken[abc]' }, update: {} });
  const llm = new MockLlmProvider({ responses: opts.responses ?? [reply('{name}, 금요일 발표는 잘 끝났어요?')] });
  const push = new RecordingPush();
  const make = (provider: LlmProvider = llm, wiki?: Pick<WikiService, 'snapshot'>) => {
    const prisma = db as unknown as PrismaService;
    return new ProactiveService(prisma, provider, push, new GalpiAccessService(prisma), (wiki as WikiService | undefined) ?? new WikiService(prisma));
  };
  return { db, llm, push, make };
}

describe('먼저 말 걸기 실행', () => {
  it('주로 대화하던 시각에 한 번 걸고, 잠금화면에는 갈피의 말만 보인다', async () => {
    const { db, llm, push, make } = await setup();
    expect(await make().runOnce(NOW)).toBe(1);

    const sent = db.galpiMessages.find((m) => m.proactive);
    expect(sent).toMatchObject({ sender: 'galpi', content: '{name}, 금요일 발표는 잘 끝났어요?' });
    expect(sent?.quickReply ?? null).toBeNull();
    expect(push.sent).toEqual([
      { to: 'ExponentPushToken[abc]', title: '갈피', body: '지은 님, 금요일 발표는 잘 끝났어요?', data: { screen: 'galpi' } },
    ]);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: NOW, unansweredProactive: 1 });
    expect(llm.calls[0]).toMatchObject({ purpose: 'proactive', userId: 'u1', responseFormat: 'json' });
  });

  it('프롬프트는 대화와 같은 앞부분에 먼저 말 걸기 지시를 붙이고, 사용자 말은 가명처리돼 있다', async () => {
    const { llm, make } = await setup();
    await make().runOnce(NOW);
    const messages = llm.calls[0].messages;
    expect(messages[messages.length - 1]).toMatchObject({ role: 'system', content: expect.stringContaining('[먼저 말 걸기]') });
    const prompt = messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('금요일에 발표가 있다');
    expect(prompt).toContain('저는 [이름]이고');
    expect(prompt).not.toContain('저는 지은이고');
    expect(prompt).not.toContain('지은');
  });

  it('같은 날 다시 돌려도 걸지 않는다', async () => {
    const { make } = await setup({ responses: [reply('{name}, 금요일 발표는 잘 끝났어요?'), reply('또 왔어요')] });
    const service = make();
    expect(await service.runOnce(NOW)).toBe(1);
    expect(await service.runOnce(kst(20, 59))).toBe(0);
  });

  it('서버 두 대가 같은 시각에 돌려도 한 번만 건다 (리뷰 4)', async () => {
    const { db, push, make } = await setup({ responses: [reply('하나'), reply('둘')] });
    const results = await Promise.all([make().runOnce(NOW), make().runOnce(NOW)]);
    expect(results.reduce((a, b) => a + b, 0)).toBe(1);
    expect(db.galpiMessages.filter((m) => m.proactive)).toHaveLength(1);
    expect(push.sent).toHaveLength(1);
  });

  it('서버 두 대가 같은 시각에 돌리면 말을 쓰러 LLM 을 부르는 것도 한 번이다 (차지가 먼저)', async () => {
    const { llm, make } = await setup({ responses: [reply('하나'), reply('둘')] });
    await Promise.all([make().runOnce(NOW), make().runOnce(NOW)]);
    expect(llm.calls).toHaveLength(1);
  });

  it('조용한 시간에는 아무도 살펴보지 않는다', async () => {
    const { llm, make } = await setup();
    expect(await make().runOnce(kst(22))).toBe(0);
    expect(llm.calls).toHaveLength(0);
  });

  it('죄책감 문구가 두 번 나오면 보내지 않고, 다음 시각에 다시 볼 수 있게 돌려놓는다', async () => {
    const { db, push, make } = await setup({ responses: [reply('왜 안 와요?'), reply('기다렸어요')] });
    expect(await make().runOnce(NOW)).toBe(0);
    expect(db.galpiMessages.some((m) => m.proactive)).toBe(false);
    expect(push.sent).toHaveLength(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
  });

  it('죄책감 문구가 한 번 나오면 다시 물어 깨끗한 말을 보낸다', async () => {
    const { db, llm, push, make } = await setup({ responses: [reply('왜 안 와요?'), reply('{name}, 금요일 발표는 잘 끝났어요?')] });
    expect(await make().runOnce(NOW)).toBe(1);
    expect(llm.calls).toHaveLength(2);
    expect(db.galpiMessages.find((m) => m.proactive)).toMatchObject({ content: '{name}, 금요일 발표는 잘 끝났어요?' });
    expect(push.sent.map((p) => p.body)).toEqual(['지은 님, 금요일 발표는 잘 끝났어요?']);
  });

  it('"소개팅"이라는 말이 두 번 나오면 보내지 않는다 — 잠금화면에 보일 수 있다', async () => {
    const { db, push, make } = await setup({ responses: [reply('소개팅 준비는 잘 돼요?'), reply('소개팅 얘기 해요')] });
    expect(await make().runOnce(NOW)).toBe(0);
    expect(db.galpiMessages.some((m) => m.proactive)).toBe(false);
    expect(push.sent).toHaveLength(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
  });

  it('LLM 이 실패해도 보내지 않는다', async () => {
    const failing: LlmProvider = { complete: () => Promise.reject(new Error('llm down')) };
    const { db, make } = await setup();
    expect(await make(failing).runOnce(NOW)).toBe(0);
    expect(db.galpiStates[0].unansweredProactive).toBe(0);
  });

  it('동의를 철회한 사람에게는 걸지 않는다', async () => {
    const { llm, make } = await setup({ user: { consents: [] } });
    expect(await make().runOnce(NOW)).toBe(0);
    expect(llm.calls).toHaveLength(0);
  });

  const blocked: [string, Partial<FakeUserInput>][] = [
    ['이용이 막힌 사람', { status: 'suspended' }],
    ['탈퇴한 사람', { status: 'withdrawn' }],
    ['본인인증을 하지 않은 사람', { identityVerified: false }],
  ];
  it.each(blocked)('%s에게는 걸지 않는다 — 말이 LLM 으로 가기 전에 보고, 조용히 건너뛴다', async (_name, user) => {
    const { db, llm, push, make } = await setup({ user });
    expect(await make().runOnce(NOW)).toBe(0);
    expect(llm.calls).toHaveLength(0);
    expect(push.sent).toHaveLength(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
    expect(warn.mock.calls).toEqual([]);
  });

  it('출입 확인이 오류로 실패해도 걸지 않는다 — 사용자 ID 만 경고로 남긴다', async () => {
    const { db, llm, push, make } = await setup();
    db.user.findUnique = () => Promise.reject(new Error('db down: 저는 지은이고 금요일에 발표가 있어요'));
    expect(await make().runOnce(NOW)).toBe(0);
    expect(llm.calls).toHaveLength(0);
    expect(push.sent).toHaveLength(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
    expect(warn.mock.calls).toEqual([['proactive access check failed user=u1']]);
  });

  it('푸시 토큰이 없거나 알림이 실패해도 대화방의 말은 남는다', async () => {
    const noToken = await setup();
    noToken.db.pushTokens = [];
    expect(await noToken.make().runOnce(NOW)).toBe(1);
    expect(noToken.push.sent).toHaveLength(0);

    const pushDown = await setup();
    pushDown.push.fail = true;
    expect(await pushDown.make().runOnce(NOW)).toBe(1);
    expect(pushDown.db.galpiMessages.some((m) => m.proactive)).toBe(true);
  });

  it('답 없는 말이 두 번 이어진 사람은 살펴보지 않는다', async () => {
    const { db, llm, make } = await setup();
    db.galpiStates[0].unansweredProactive = 2;
    expect(await make().runOnce(NOW)).toBe(0);
    expect(llm.calls).toHaveLength(0);
  });

  it('첫 말풍선 하나만 쓰고, 둘째 말풍선과 버튼은 버린다', async () => {
    const two = reply('{name}, 금요일 발표는 잘 끝났어요?', {
      messages: [
        { text: '{name}, 금요일 발표는 잘 끝났어요?', expression: 'wave' },
        { text: '그리고 요즘은 어때요?', expression: 'curious' },
      ],
    });
    const { db, push, make } = await setup({ responses: [two] });
    expect(await make().runOnce(NOW)).toBe(1);
    const sent = db.galpiMessages.filter((m) => m.proactive);
    expect(sent.map((m) => m.content)).toEqual(['{name}, 금요일 발표는 잘 끝났어요?']);
    expect(sent[0].quickReply ?? null).toBeNull();
    expect(push.sent.map((p) => p.body)).toEqual(['지은 님, 금요일 발표는 잘 끝났어요?']);
  });
});

describe('위기 신호가 섞인 말은 보내지 않는다 (completeReply 의 crisis)', () => {
  const crisisReply = (crisis = 'self_harm') => reply('{name}, 괜찮아요?', { signals: { userUsedCasual: false, crisis } });

  it('갈피가 위기 신호를 알린 말은 보내지 않고, 차지는 그대로 둔다 — 그날을 쓰고 답 없는 말 한 번으로 센다', async () => {
    for (const crisis of ['danger', 'self_harm']) {
      const { db, llm, push, make } = await setup({ responses: [crisisReply(crisis)] });
      expect(await make().runOnce(NOW)).toBe(0);
      expect(db.galpiMessages.some((m) => m.proactive)).toBe(false);
      expect(push.sent).toHaveLength(0);
      expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: NOW, unansweredProactive: 1 });

      // 같은 날 다시 돌려도 LLM 을 부르지 않는다 — 위기 대화를 매시 다시 국외로 보내지 않는다
      expect(await make().runOnce(kst(20, 30))).toBe(0);
      expect(llm.calls).toHaveLength(1);
    }
  });

  it('앞 시도가 위기 신호를 알리고 금지 표현으로 버려졌으면, 뒤 시도가 깨끗해도 보내지 않고 차지는 그대로 둔다', async () => {
    const { db, llm, push, make } = await setup({
      responses: [reply('왜 안 와요?', { signals: { userUsedCasual: false, crisis: 'self_harm' } }), reply('{name}, 금요일 발표는 잘 끝났어요?')],
    });
    expect(await make().runOnce(NOW)).toBe(0);
    expect(llm.calls).toHaveLength(2);
    expect(db.galpiMessages.some((m) => m.proactive)).toBe(false);
    expect(push.sent).toHaveLength(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: NOW, unansweredProactive: 1 });
  });

  it('위기 표시가 답 없는 말 상한만큼 이어지면 사용자가 다시 말할 때까지 LLM 을 부르지 않는다', async () => {
    const max = POLICY.galpi.maxUnansweredProactive;
    const { db, llm, push, make } = await setup({
      responses: [...Array.from({ length: max }, () => crisisReply()), reply('{name}, 오늘은 어떻게 지냈어요?')],
    });
    const service = make();
    // 12일부터 하루 한 번씩 위기 표시된 말이 온다
    for (let i = 0; i < max; i += 1) expect(await service.runOnce(kst(20, 0, 12 + i))).toBe(0);
    expect(llm.calls).toHaveLength(max);
    expect(db.galpiStates[0].unansweredProactive).toBe(max);

    // 그 뒤로는 날이 바뀌어도 살펴보지 않는다
    expect(await service.runOnce(kst(20, 0, 12 + max))).toBe(0);
    expect(await service.runOnce(kst(20, 0, 13 + max))).toBe(0);
    expect(llm.calls).toHaveLength(max);

    // 사용자가 다시 말하면 — 대화가 답 없는 수를 0 으로 되돌린다(conversation.service) — 다음 날 다시 건다
    const back = kst(20, 30, 13 + max);
    await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '저 왔어요', createdAt: back } });
    Object.assign(db.galpiStates[0], { lastUserMessageAt: back, unansweredProactive: 0 });
    expect(await service.runOnce(kst(20, 0, 14 + max))).toBe(1);
    expect(llm.calls).toHaveLength(max + 1);
    expect(push.sent.map((p) => p.body)).toEqual(['지은 님, 오늘은 어떻게 지냈어요?']);
  });

  it('위기 표시가 없는 쓸 수 없는 말은 지금처럼 차지를 돌려놓아 다음 시각에 다시 본다', async () => {
    const { db, llm, make } = await setup({ responses: [reply('왜 안 와요?'), reply('기다렸어요'), reply('{name}, 금요일 발표는 잘 끝났어요?')] });
    expect(await make().runOnce(NOW)).toBe(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
    expect(await make().runOnce(kst(20, 30))).toBe(1);
    expect(llm.calls).toHaveLength(3);
  });
});

describe('안 보내게 되면 차지를 돌려놓는다 (리뷰 4)', () => {
  it('서고를 읽다 실패해도 던지지 않고, 차지를 돌려놓아 다음 시각에 다시 본다', async () => {
    const { db, push, make } = await setup();
    const brokenWiki = { snapshot: () => Promise.reject(new Error('db down: 저는 지은이고 금요일에 발표가 있어요')) };
    await expect(make(undefined, brokenWiki).runOnce(NOW)).resolves.toBe(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
    expect(push.sent).toHaveLength(0);

    // 되돌려 놓았으니 서고가 살아나면 같은 시각대에 다시 걸 수 있다
    expect(await make().runOnce(kst(20, 30))).toBe(1);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: kst(20, 30), unansweredProactive: 1 });
  });

  it('말을 저장하다 실패해도 던지지 않고 차지를 돌려놓는다 — 보낸 것이 없으니 센 적도 없다', async () => {
    const { db, push, make } = await setup();
    db.galpiMessage.create = () => Promise.reject(new Error('db down'));
    await expect(make().runOnce(NOW)).resolves.toBe(0);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
    expect(push.sent).toHaveLength(0);
  });

  it('돌려놓기는 앞서 센 값에서 하나를 빼는 것이 아니라 차지한 그 값일 때만 한다 — 답을 쓰는 사이 사용자가 돌아와도 수가 음수가 되지 않는다', async () => {
    const { db, make } = await setup();
    const returning: LlmProvider = {
      complete: async () => {
        // 갈피의 말을 쓰는 사이 사용자가 말했다 — 대화가 답 없는 수를 0 으로 되돌린다
        Object.assign(db.galpiStates[0], { lastUserMessageAt: kst(20, 0), unansweredProactive: 0 });
        return { content: reply('왜 안 와요?'), inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
      },
    };
    expect(await make(returning).runOnce(NOW)).toBe(0);
    expect(db.galpiStates[0].unansweredProactive).toBe(0);
  });

  it('상태를 읽은 직후 사용자가 말하면 걸지 않는다 — 한 번에 읽은 상태가 오래돼도 방금 말한 사람에게 먼저 걸지 않는다', async () => {
    const { db, llm, push, make } = await setup();
    const readStates = db.galpiState.findMany;
    db.galpiState.findMany = async (args) => {
      const snapshot = await readStates(args);
      // 읽은 직후 사용자가 말했다
      Object.assign(db.galpiStates[0], { lastUserMessageAt: kst(19, 59), unansweredProactive: 0 });
      return snapshot;
    };
    expect(await make().runOnce(NOW)).toBe(0);
    expect(llm.calls).toHaveLength(0);
    expect(push.sent).toHaveLength(0);
    expect(db.galpiMessages.some((m) => m.proactive)).toBe(false);
    expect(db.galpiStates[0]).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
  });

  it('한 사람에게 실패해도 다른 사람에게는 건다', async () => {
    const { db, push, make } = await setup({ responses: [reply('{name}, 요즘 어떻게 지내요?')] });
    db.addUser({ id: 'u2', displayName: '수지' });
    await db.galpiState.create({ data: { userId: 'u2', firstMeetingAt: kst(10, 0, 10), lastUserMessageAt: kst(20, 30, 11) } });
    await db.galpiMessage.create({ data: { userId: 'u2', sender: 'user', content: '안녕하세요', createdAt: kst(20, 30, 11) } });
    await db.pushToken.upsert({ where: { userId: 'u2' }, create: { userId: 'u2', token: 'ExponentPushToken[def]' }, update: {} });
    const real = new WikiService(db as unknown as PrismaService);
    // 첫 사람(u1)의 서고만 읽히지 않는다
    const wiki = { snapshot: (userId: string) => (userId === 'u1' ? Promise.reject(new Error('db down')) : real.snapshot(userId)) };

    expect(await make(undefined, wiki).runOnce(NOW)).toBe(1);
    expect(push.sent.map((p) => p.to)).toEqual(['ExponentPushToken[def]']);
    expect(db.galpiStates.find((s) => s.userId === 'u1')).toMatchObject({ lastProactiveAt: null, unansweredProactive: 0 });
    expect(db.galpiStates.find((s) => s.userId === 'u2')).toMatchObject({ lastProactiveAt: NOW, unansweredProactive: 1 });
  });
});

describe('언제 거는지 — 서비스가 읽는 기록', () => {
  it('안전 안내를 한 지 24시간이 안 됐으면 걸지 않는다', async () => {
    const recent = await setup();
    await recent.db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '안전 안내', safety: true, createdAt: kst(21, 0, 11) } });
    expect(await recent.make().runOnce(NOW)).toBe(0);
    expect(recent.llm.calls).toHaveLength(0);

    const older = await setup();
    await older.db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '안전 안내', safety: true, createdAt: kst(19, 0, 11) } });
    expect(await older.make().runOnce(NOW)).toBe(1);
  });

  it('주로 대화하던 시각은 최근 사용자 말에서 정한다', async () => {
    const { db, make } = await setup();
    for (const day of [9, 10, 11]) {
      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '점심이에요', createdAt: kst(12, 10, day) } });
    }
    // 점심에 세 번, 저녁에 한 번 말했다 → 12시. 12시 전에는 걸지 않고 12시부터 건다
    expect(await make().runOnce(kst(11, 59))).toBe(0);
    expect(await make().runOnce(kst(12))).toBe(1);
  });

  it('건너뛰기로 보낸 말은 주로 대화하던 시각에 세지 않는다', async () => {
    const { db, make } = await setup();
    for (const day of [9, 10, 11]) {
      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '다른 얘기 할래요', skipped: true, createdAt: kst(12, 10, day) } });
    }
    expect(await make().runOnce(kst(12))).toBe(0);
    expect(await make().runOnce(NOW)).toBe(1);
  });
});

describe('잠금화면 알림과 로그', () => {
  it('본문은 80자까지만 — 이모지를 반으로 가르지 않는다', async () => {
    // 79번째 글자가 이모지(UTF-16 으로 두 칸)다. 칸 수로 자르면 앞 절반만 남아 알림이 깨진다
    const long = `${'가'.repeat(78)}😌${'나'.repeat(10)}`;
    const { push, make } = await setup({ responses: [reply(long)] });
    expect(await make().runOnce(NOW)).toBe(1);
    const [body] = push.sent.map((p) => p.body);
    expect(body).toBe(`${'가'.repeat(78)}😌…`);
    expect(body).not.toMatch(/\p{Surrogate}/u);
    expect([...body]).toHaveLength(80);
  });

  it('80자 이하의 말은 그대로 보낸다', async () => {
    const exact = '나'.repeat(80);
    const { push, make } = await setup({ responses: [reply(exact)] });
    expect(await make().runOnce(NOW)).toBe(1);
    expect(push.sent.map((p) => p.body)).toEqual([exact]);
  });

  it('로그에는 사용자 ID 만 남긴다 — 말 본문·이름·오류 내용은 남기지 않는다', async () => {
    const ok = await setup();
    expect(await ok.make().runOnce(NOW)).toBe(1);
    expect(log.mock.calls).toEqual([['proactive sent user=u1']]);
    expect(warn.mock.calls).toEqual([]);

    // 알림 실패 — 오류가 말을 담고 있어도 로그에는 나오지 않는다
    const pushDown = await setup();
    pushDown.push.send = () => Promise.reject(new Error('push down: 지은 님, 금요일 발표는 잘 끝났어요?'));
    expect(await pushDown.make().runOnce(NOW)).toBe(1);

    // 서고 실패
    const wikiDown = await setup();
    const leaky = { snapshot: () => Promise.reject(new Error('db down: 저는 지은이고 금요일에 발표가 있어요')) };
    expect(await wikiDown.make(undefined, leaky).runOnce(NOW)).toBe(0);

    // 쓸 수 없는 말
    const unusable = await setup({ responses: [reply('왜 안 와요?'), reply('기다렸어요')] });
    expect(await unusable.make().runOnce(NOW)).toBe(0);

    expect(warn.mock.calls).toEqual([
      ['proactive push failed user=u1'],
      ['proactive failed user=u1'],
      ['proactive reply unusable user=u1'],
    ]);
    const everything = JSON.stringify([log.mock.calls, warn.mock.calls]);
    for (const secret of ['지은', '발표', '왜 안 와', '기다렸', 'down', 'ExponentPushToken']) expect(everything).not.toContain(secret);
  });
});
