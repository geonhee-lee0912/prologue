import { Logger } from '@nestjs/common';
import {
  ErrorCode,
  GALPI_COPY,
  GALPI_SKIP_TEXT,
  type LlmMessage,
  type LlmProvider,
  MASKED_TEXT_DISPLAY,
  MockLlmProvider,
} from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { GalpiAccessService } from './access.service';
import { ConversationService } from './conversation.service';
import { completeReply } from './reply-llm';
import { FakePrisma, type FakeUserInput } from './testing/fake-prisma';
import type { IngestService } from './wiki/ingest.service';
import { WikiService } from './wiki/wiki.service';

const NOW = new Date('2026-10-11T03:00:00Z');

function reply(text: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({ messages: [{ text, expression: 'curious' }], quickReply: null, signals: { userUsedCasual: false, crisis: 'none' }, ...extra });
}

function setup(responses: string[] = [], user: Partial<FakeUserInput> = {}, llmOverride?: LlmProvider) {
  const db = new FakePrisma();
  db.addUser({ id: 'u1', displayName: '지은', ...user });
  const llm = new MockLlmProvider({ responses });
  const prisma = db as unknown as PrismaService;
  const ingest = { runForUser: vi.fn().mockResolvedValue(undefined) };
  const wiki = new WikiService(prisma);
  const service = new ConversationService(prisma, llmOverride ?? llm, new GalpiAccessService(prisma), wiki, ingest as unknown as IngestService);
  return { db, llm, ingest, wiki, service };
}

async function started(responses: string[] = [], user: Partial<FakeUserInput> = {}, llmOverride?: LlmProvider) {
  const ctx = setup(responses, user, llmOverride);
  await ctx.service.start('u1', NOW);
  return ctx;
}

const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

/** 짝 없는 서로게이트가 없는 글 — DB 와 JSON 에서 깨지지 않는다 */
const wellFormed = (text: string) => !/\p{Surrogate}/u.test(text);

// LLM 이 실패하는 시험은 경고 로그를 남긴다 — 출력에 섞이지 않게 막고, 무엇을 남겼는지 확인한다
let warn: MockInstance<Logger['warn']>;

beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

const warned = () => warn.mock.calls.map((call) => String(call[0])).join('\n');

describe('첫 만남 (갈피 문서 3.6 ③)', () => {
  it('손 흔드는 이모티콘과 고정 대사 세 줄을 놓는다', async () => {
    const { service } = setup();
    const result = await service.start('u1', NOW);
    expect(result.messages.map((m) => m.kind)).toEqual(['emoticon', 'text', 'text', 'text']);
    expect(result.messages.slice(1).map((m) => m.text)).toEqual([...GALPI_COPY.firstMeeting]);
  });

  it('두 번 불러도, 동시에 불러도 한 번만 놓는다 (리뷰 2)', async () => {
    const { db, service } = setup();
    await service.start('u1', NOW);
    await service.start('u1', later(1));
    expect(db.galpiMessages).toHaveLength(4);

    const other = setup();
    await Promise.all([other.service.start('u1', NOW), other.service.start('u1', NOW)]);
    expect(other.db.galpiMessages).toHaveLength(4);
    expect(other.db.galpiStates).toHaveLength(1);
  });

  it('동의가 없으면 첫 만남도 열리지 않지만 기록 보기는 된다', async () => {
    const { service } = setup([], { consents: [] });
    await expect(service.start('u1', NOW)).rejects.toMatchObject({ code: ErrorCode.AI_CONSENT_REQUIRED });
    await expect(service.history('u1', {})).resolves.toEqual({ messages: [] });
  });
});

describe('말 주고받기', () => {
  it('첫 만남 전에 말하면 GALPI_NOT_STARTED', async () => {
    const { service } = setup();
    await expect(service.send('u1', { text: '안녕' }, NOW)).rejects.toMatchObject({ code: ErrorCode.GALPI_NOT_STARTED });
  });

  it('빈 말은 받지 않는다', async () => {
    const { service } = await started();
    await expect(service.send('u1', { text: '   ' }, later(1))).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
  });

  it('내 말은 연락처를 지우고 민감정보를 가려 저장하고, 갈피 답을 돌려준다', async () => {
    const { db, llm, service } = await started([reply('말해 줘서 고마워요. 이 이야기는 편지에 담지 않아요.')]);
    const result = await service.send('u1', { text: '제 번호는 010-1234-5678 이고 우울증이 있어요' }, later(1));

    const saved = db.galpiMessages.find((m) => m.sender === 'user');
    expect(saved).toMatchObject({ content: '제 번호는 [연락처] 이고 [민감정보:건강]이 있어요', sensitiveCategories: ['HEALTH'] });
    expect(result.messages[0]).toMatchObject({ from: 'me', text: `제 번호는 [연락처] 이고 ${MASKED_TEXT_DISPLAY}이 있어요` });
    expect(result.messages[1]).toMatchObject({ from: 'galpi', text: '말해 줘서 고마워요. 이 이야기는 편지에 담지 않아요.', expression: 'curious' });
    expect(llm.calls[0].messages[1].content).toContain('방금 민감한 이야기가 나왔다');
  });

  it('LLM 에 가는 대화는 가명처리되어 있다', async () => {
    const { llm, service } = await started([reply('오, 좋다.')]);
    await service.send('u1', { text: '저는 지은이고 퇴근하고 걸어요' }, later(1));
    const last = llm.calls[0].messages[llm.calls[0].messages.length - 1];
    expect(last).toEqual({ role: 'user', content: '저는 [이름]이고 퇴근하고 걸어요' });
    expect(llm.calls[0]).toMatchObject({ purpose: 'reply', userId: 'u1', responseFormat: 'json' });
  });

  it('위기 신호면 LLM 없이 안전 안내를 한다', async () => {
    const { db, llm, service } = await started();
    const result = await service.send('u1', { text: '요즘 죽고 싶어요' }, later(1));
    expect(llm.calls).toHaveLength(0);
    expect(result.messages[1]).toMatchObject({ from: 'galpi', text: GALPI_COPY.crisis.selfHarm });
    expect(db.galpiMessages.find((m) => m.safety)).toBeTruthy();
  });

  it('갈피가 위험을 알아채면 답 뒤에 안전 안내를 붙이고 버튼은 버린다', async () => {
    const { service } = await started([
      reply('많이 무서웠겠어요.', { signals: { userUsedCasual: false, crisis: 'danger' }, quickReply: { type: 'practical', fact: 'smoking' } }),
    ]);
    const result = await service.send('u1', { text: '누가 집 앞에 계속 서 있어요' }, later(1));
    expect(result.messages.map((m) => m.text)).toEqual(['누가 집 앞에 계속 서 있어요', '많이 무서웠겠어요.', GALPI_COPY.crisis.danger]);
    expect(result.messages[1].quickReply).toBeUndefined();
  });

  it('읽을 수 없는 답이 두 번 오면 대체 문장으로 답하고, 내 말은 남는다 (리뷰 1)', async () => {
    const { db, llm, service } = await started(['안녕하세요!', '```\n깨진 답\n```']);
    const result = await service.send('u1', { text: '퇴근하고 걸어요' }, later(1));
    expect(llm.calls).toHaveLength(2);
    expect(result.messages[1].text).toBe(GALPI_COPY.fallback);
    expect(db.galpiMessages.some((m) => m.sender === 'user' && m.content === '퇴근하고 걸어요')).toBe(true);
  });

  it('LLM 이 실패해도 대체 문장으로 답한다', async () => {
    const failing: LlmProvider = { complete: () => Promise.reject(new Error('llm down')) };
    const { service } = await started([], {}, failing);
    const result = await service.send('u1', { text: '퇴근하고 걸어요' }, later(1));
    expect(result.messages[1].text).toBe(GALPI_COPY.fallback);
  });

  it('금지 표현이 나오면 한 번 다시 묻는다', async () => {
    const { llm, service } = await started([reply('운명 같은 이야기네요.'), reply('오, 좋다. 혼자 걸어요?')]);
    const result = await service.send('u1', { text: '퇴근하고 걸어요' }, later(1));
    expect(llm.calls).toHaveLength(2);
    expect(llm.calls[1].messages[llm.calls[1].messages.length - 1].content).toContain('쓰지 않는 말(운명)');
    expect(result.messages[1].text).toBe('오, 좋다. 혼자 걸어요?');
  });

  it('이모지는 하나만 남긴다', async () => {
    const { service } = await started([reply('좋다 🙂🙂')]);
    expect((await service.send('u1', { text: '산책했어요' }, later(1))).messages[1].text).toBe('좋다 🙂');
  });

  it('실용 정보 버튼은 마지막 말풍선에 붙고, 이미 아는 칸이면 버린다', async () => {
    const { db, service } = await started([
      reply('담배는 피워요?', { quickReply: { type: 'practical', fact: 'smoking' } }),
      reply('결혼 생각은 있어요?', { quickReply: { type: 'practical', fact: 'smoking' } }),
    ]);
    const first = await service.send('u1', { text: '연애 얘기 해요' }, later(1));
    expect(first.messages[1].quickReply).toMatchObject({ type: 'practical', fact: 'smoking', answeredKey: null });
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key: 'smoking' } }, create: { userId: 'u1', key: 'smoking', value: 'no' }, update: {} });
    const second = await service.send('u1', { text: '네' }, later(2));
    expect(second.messages[1].quickReply).toBeUndefined();
  });

  it('조건 허락 버튼은 이미 답한 칸이면 버린다', async () => {
    const { db, service } = await started([reply('편지에 적어도 될까요?', { quickReply: { type: 'condition_permission', fact: 'company' } })]);
    await db.profileFact.upsert({ where: { userId_key: { userId: 'u1', key: 'company' } }, create: { userId: 'u1', key: 'company', value: 'A사', letterAllowed: false }, update: {} });
    expect((await service.send('u1', { text: 'A사 다녀요' }, later(1))).messages[1].quickReply).toBeUndefined();
  });

  it('사용자가 반말을 쓰면 말 놓기를 한 번 꺼낸다', async () => {
    const casual = reply('오, 그랬구나.', { signals: { userUsedCasual: true, crisis: 'none' } });
    const { db, service } = await started([casual, casual]);
    const first = await service.send('u1', { text: 'ㅇㅇ 오늘 피곤했어' }, later(1));
    expect(first.messages[2]).toMatchObject({ text: GALPI_COPY.speechOffer, quickReply: { type: 'speech_level', answeredKey: null } });
    expect(db.galpiStates[0].casualOfferedAt).toEqual(later(1));
    const second = await service.send('u1', { text: '진짜 피곤해' }, later(2));
    expect(second.messages).toHaveLength(2);
  });

  it('알게 되고 60분 넘게 지나 다시 말하면 말 놓기를 꺼낸다', async () => {
    const { db, service } = await started([reply('오랜만이에요.')]);
    db.galpiStates[0].knownAt = new Date(later(1).getTime() - 61 * 60_000);
    const result = await service.send('u1', { text: '안녕' }, later(1));
    expect(result.messages.map((m) => m.text)).toContain(GALPI_COPY.speechOffer);
  });

  it('알아가는 동안 내 말이 4번 쌓이면 서고 수집을 띄운다, 알게 된 뒤에는 띄우지 않는다', async () => {
    const { db, ingest, service } = await started(Array.from({ length: 6 }, () => reply('그렇구나.')));
    for (let i = 1; i <= 4; i += 1) await service.send('u1', { text: `이야기 ${i}` }, later(i));
    expect(ingest.runForUser).toHaveBeenCalledTimes(1);
    db.galpiStates[0].knownAt = NOW;
    db.galpiStates[0].turnsSinceIngest = 10;
    await service.send('u1', { text: '이야기 5' }, later(5));
    expect(ingest.runForUser).toHaveBeenCalledTimes(1);
  });

  it('"다른 얘기 할래요"는 턴으로 세지 않고, 이유를 묻지 말라고 알린다', async () => {
    const { db, llm, service } = await started([reply('그럼 요즘 즐거운 건 뭐예요?')]);
    const result = await service.send('u1', { text: '', skipped: true }, later(1));
    expect(result.messages[0]).toMatchObject({ from: 'me', text: GALPI_SKIP_TEXT });
    expect(db.galpiStates[0].userTurns).toBe(0);
    expect(llm.calls[0].messages[1].content).toContain('이유를 묻지 말고');
  });

  it('말을 놓은 뒤의 갈피 말만 반말 호칭이 되고, 지난 말은 그대로다', async () => {
    const { db, service } = await started([reply('{name}, 반가워요'), reply('{name}, 또 왔네')]);
    const before = await service.send('u1', { text: '안녕' }, later(1));
    db.galpiStates[0].speechLevel = 'casual';
    db.galpiStates[0].casualOfferedAt = later(2);
    const after = await service.send('u1', { text: '나 왔어' }, later(3));
    expect(after.messages[1].text).toBe('지은아, 또 왔네');
    const all = await service.history('u1', {});
    expect(all.messages.find((m) => m.id === before.messages[1].id)?.text).toBe('지은 님, 반가워요');
  });

  it('갈피가 가명 [이름] 을 그대로 쓰면 호칭으로 바꿔 보낸다', async () => {
    const { service } = await started([reply('[이름], 반가워요')]);
    expect((await service.send('u1', { text: '안녕' }, later(1))).messages[1].text).toBe('지은 님, 반가워요');
  });

  it('내가 말하면 답 없는 먼저 말 걸기 수가 0 이 된다 (스펙 7장)', async () => {
    const { db, service } = await started([reply('왔구나.')]);
    db.galpiStates[0].unansweredProactive = 2;
    await service.send('u1', { text: '안녕' }, later(1));
    expect(db.galpiStates[0]).toMatchObject({ unansweredProactive: 0, lastUserMessageAt: later(1) });
  });

  it('갈피 빼기로 지운 원문은 다음 프롬프트에 들어가지 않는다 (리뷰 5)', async () => {
    const { db, llm, wiki, service } = await started([reply('그렇구나.'), reply('응응.')]);
    await service.send('u1', { text: '사실 전 회사가 싫어요' }, later(1));
    const source = db.galpiMessages.find((m) => m.content === '사실 전 회사가 싫어요');
    const claim = await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '회사가 싫다', sources: { create: [{ messageId: source?.id }] } } });
    await wiki.removeClaim('u1', claim.id);
    await service.send('u1', { text: '오늘은 괜찮아요' }, later(2));
    const prompt = llm.calls[1].messages.map((m) => m.content).join('\n');
    expect(prompt).not.toContain('회사가 싫어요');
  });

  it('지운 원문이 유일한 출처였던 다른 문장도 다음 프롬프트에서 사라진다 (리뷰 5)', async () => {
    const { db, llm, wiki, service } = await started([reply('그렇구나.'), reply('응응.')]);
    await service.send('u1', { text: '사실 전 회사가 싫어요' }, later(1));
    const source = db.galpiMessages.find((m) => m.content === '사실 전 회사가 싫어요');
    const removed = await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '회사가 싫다', sources: { create: [{ messageId: source?.id }] } } });
    // 같은 원문에서만 나온 다른 문장 — 출처가 없어지면 함께 지워진다
    await db.wikiClaim.create({ data: { userId: 'u1', page: 'people', text: '직장 동료와 거리를 둔다', sources: { create: [{ messageId: source?.id }] } } });
    await wiki.removeClaim('u1', removed.id);
    await service.send('u1', { text: '오늘은 괜찮아요' }, later(2));
    const prompt = llm.calls[1].messages.map((m) => m.content).join('\n');
    expect(prompt).not.toContain('회사가 싫');
    expect(prompt).not.toContain('직장 동료');
  });
});

describe('LLM 이 이상한 답을 줘도 (리뷰 1)', () => {
  const broken: [string, string][] = [
    ['JSON 이 아닌 글', '안녕하세요!'],
    ['빈 응답', ''],
    ['공백뿐인 응답', '  \n '],
    ['JSON null', 'null'],
    ['JSON 배열', '[]'],
    ['messages 가 글', '{"messages":"안녕"}'],
    ['말풍선 text 가 숫자', '{"messages":[{"text":42}]}'],
    ['말풍선이 공백뿐', '{"messages":[{"text":"   "}]}'],
    ['금지 이모지뿐인 말풍선', '{"messages":[{"text":"😭😭"}]}'],
    ['messages 가 없음', '{"foo":1}'],
    ['중간에 끊긴 JSON', '{"messages":[{"text":"안녕'],
  ];

  it.each(broken)('%s — 내 말은 남고 대체 문장으로 답한다, 500 이 나지 않는다', async (_name, answer) => {
    const { db, llm, service } = await started([answer, answer]);
    const result = await service.send('u1', { text: '퇴근하고 걸어요' }, later(1));
    expect(llm.calls).toHaveLength(2);
    expect(result.messages.map((m) => m.text)).toEqual(['퇴근하고 걸어요', GALPI_COPY.fallback]);
    expect(db.galpiMessages.some((m) => m.sender === 'user' && m.content === '퇴근하고 걸어요')).toBe(true);
  });

  it('코드펜스로 감싼 JSON 은 그대로 읽는다 — 다시 묻지 않는다', async () => {
    const { llm, service } = await started([`\`\`\`json\n${reply('오, 좋다.')}\n\`\`\``]);
    const result = await service.send('u1', { text: '산책했어요' }, later(1));
    expect(llm.calls).toHaveLength(1);
    expect(result.messages[1].text).toBe('오, 좋다.');
  });

  it('첫 답이 깨졌어도 두 번째가 괜찮으면 그 답으로 한다', async () => {
    const { llm, service } = await started(['', reply('오, 좋다.')]);
    const result = await service.send('u1', { text: '산책했어요' }, later(1));
    expect(llm.calls).toHaveLength(2);
    expect(llm.calls[1].messages[llm.calls[1].messages.length - 1].content).toContain('형식에 맞지 않았다');
    expect(result.messages[1].text).toBe('오, 좋다.');
  });
});

describe('버려진 답이 위기 신호를 알렸을 때 — 안전 안내는 잃지 않는다 (리뷰 1)', () => {
  const flagged = (text: string, crisis: string) => reply(text, { signals: { userUsedCasual: false, crisis } });
  const tired = '요즘 많이 지쳐요';

  it.each([
    ['self_harm', GALPI_COPY.crisis.selfHarm],
    ['danger', GALPI_COPY.crisis.danger],
  ])('금지 표현으로 두 번 버려져도 첫 답이 알린 %s 신호는 남는다 — 대체 문장 뒤에 안전 안내', async (crisis, message) => {
    const { db, llm, service } = await started([flagged('운명 같은 이야기네요.', crisis), reply('운명이에요.')]);
    const result = await service.send('u1', { text: tired }, later(1));
    expect(llm.calls).toHaveLength(2);
    expect(result.messages.map((m) => m.text)).toEqual([tired, GALPI_COPY.fallback, message]);
    expect(result.messages[1].quickReply).toBeUndefined();
    expect(db.galpiMessages.filter((m) => m.safety).map((m) => m.content)).toEqual([message]);
  });

  it('두 번째 답이 버려지며 알린 신호도 센다 — 더 강한 쪽이 남는다', async () => {
    const { service } = await started([flagged('운명 같은 이야기네요.', 'danger'), flagged('운명이에요.', 'self_harm')]);
    const result = await service.send('u1', { text: tired }, later(1));
    expect(result.messages.map((m) => m.text)).toEqual([tired, GALPI_COPY.fallback, GALPI_COPY.crisis.selfHarm]);
  });

  it('버려진 답이 위기 신호를 알리지 않았으면 안전 안내를 붙이지 않는다', async () => {
    const { db, service } = await started([reply('운명 같은 이야기네요.'), reply('운명이에요.')]);
    const result = await service.send('u1', { text: tired }, later(1));
    expect(result.messages.map((m) => m.text)).toEqual([tired, GALPI_COPY.fallback]);
    expect(db.galpiMessages.some((m) => m.safety)).toBe(false);
  });

  it('다시 물어 받은 답이 괜찮아도 첫 답이 알린 신호는 남는다 — 답 뒤에 안전 안내, 버튼은 버린다', async () => {
    const { db, service } = await started([
      flagged('운명 같은 이야기네요.', 'self_harm'),
      reply('많이 힘들었겠어요.', { quickReply: { type: 'practical', fact: 'smoking' } }),
    ]);
    const result = await service.send('u1', { text: tired }, later(1));
    expect(result.messages.map((m) => m.text)).toEqual([tired, '많이 힘들었겠어요.', GALPI_COPY.crisis.selfHarm]);
    expect(result.messages[1].quickReply).toBeUndefined();
    expect(db.galpiMessages.filter((m) => m.safety)).toHaveLength(1);
  });

  it('읽을 수 없는 답은 신호도 없다 — 이어서 읽을 수 있는 답이 알린 신호만 남는다', async () => {
    const { service } = await started(['안녕하세요!', flagged('운명이에요.', 'danger')]);
    const result = await service.send('u1', { text: tired }, later(1));
    expect(result.messages.map((m) => m.text)).toEqual([tired, GALPI_COPY.fallback, GALPI_COPY.crisis.danger]);
  });

  it('LLM 이 실패하면 신호가 없다 — 대체 문장만 하고 안전 안내는 붙이지 않는다', async () => {
    const failing: LlmProvider = { complete: () => Promise.reject(new Error('llm down')) };
    const { db, service } = await started([], {}, failing);
    const result = await service.send('u1', { text: tired }, later(1));
    expect(result.messages.map((m) => m.text)).toEqual([tired, GALPI_COPY.fallback]);
    expect(db.galpiMessages.some((m) => m.safety)).toBe(false);
  });

  it('첫 답이 신호를 알리고 버려진 뒤 다시 묻다가 LLM 이 실패해도 신호는 남는다', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ content: flagged('운명 같은 이야기네요.', 'self_harm'), inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 })
      .mockRejectedValue(new Error('llm down'));
    const { db, service } = await started([], {}, { complete });
    const result = await service.send('u1', { text: tired }, later(1));
    expect(complete).toHaveBeenCalledTimes(2);
    expect(result.messages.map((m) => m.text)).toEqual([tired, GALPI_COPY.fallback, GALPI_COPY.crisis.selfHarm]);
    expect(db.galpiMessages.filter((m) => m.safety).map((m) => m.content)).toEqual([GALPI_COPY.crisis.selfHarm]);
  });

  it('안전 안내 뒤에는 말 놓기도 꺼내지 않는다', async () => {
    const { db, service } = await started([
      flagged('운명 같은 이야기네요.', 'self_harm'),
      reply('운명이에요.', { signals: { userUsedCasual: true, crisis: 'none' } }),
    ]);
    await service.send('u1', { text: tired }, later(1));
    expect(db.galpiMessages.some((m) => m.content === GALPI_COPY.speechOffer)).toBe(false);
    expect(db.galpiStates[0].casualOfferedAt).toBeNull();
  });
});

describe('기록', () => {
  it('before 로 앞쪽을 이어서 본다', async () => {
    const { service } = await started();
    const all = await service.history('u1', {});
    const page = await service.history('u1', { before: all.messages[2].id });
    expect(page.messages.map((m) => m.id)).toEqual(all.messages.slice(0, 2).map((m) => m.id));
  });

  it('limit 은 1~100 사이로 맞춘다 — 0·음수·소수·숫자가 아닌 값은 기본값', async () => {
    const { db, service } = await started();
    const all = await service.history('u1', {});
    expect((await service.history('u1', { limit: 2 })).messages.map((m) => m.id)).toEqual(all.messages.slice(-2).map((m) => m.id));
    for (const limit of [0, -3, 1.5, Number.NaN]) {
      expect((await service.history('u1', { limit })).messages).toHaveLength(4);
    }
    for (let i = 0; i < 120; i += 1) {
      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: `말 ${i}`, createdAt: new Date(NOW.getTime() + 10_000 + i) } });
    }
    expect((await service.history('u1', { limit: 1000 })).messages).toHaveLength(100);
  });

  it('없는 before(지워졌거나 남의 것)는 빈 기록이다 — 가장 최근 쪽을 다시 주지 않는다', async () => {
    const { db, service } = await started();
    db.addUser({ id: 'u2', displayName: '민수' });
    const theirs = await db.galpiMessage.create({ data: { userId: 'u2', sender: 'user', content: '남의 말', createdAt: later(5) } });
    await expect(service.history('u1', { before: 'nope' })).resolves.toEqual({ messages: [] });
    await expect(service.history('u1', { before: theirs.id })).resolves.toEqual({ messages: [] });
  });

  it('남의 기록은 보이지 않는다', async () => {
    const { db, service } = await started();
    db.addUser({ id: 'u2', displayName: '민수' });
    await db.galpiMessage.create({ data: { userId: 'u2', sender: 'user', content: '남의 말', createdAt: later(5) } });
    const all = await service.history('u1', {});
    expect(all.messages).toHaveLength(4);
    expect(all.messages.map((m) => m.text)).not.toContain('남의 말');
  });
});

describe('깨진 글자 (리뷰 1 — 저장이 거절돼 500 이 나지 않는다)', () => {
  it('내 말의 짝 없는 서로게이트·널 문자는 빼고 저장한다 — LLM 에도 가지 않는다', async () => {
    const { db, llm, service } = await started([reply('좋다.')]);
    const result = await service.send('u1', { text: '퇴근하고\ud83d 걸어요\u0000 🙂' }, later(1));
    expect(db.galpiMessages.find((m) => m.sender === 'user')?.content).toBe('퇴근하고 걸어요 🙂');
    expect(result.messages[0].text).toBe('퇴근하고 걸어요 🙂');
    expect(llm.calls[0].messages[llm.calls[0].messages.length - 1].content).toBe('퇴근하고 걸어요 🙂');
  });

  it('깨진 글자 뒤에 가려져 있던 앞뒤 공백도 다듬는다', async () => {
    const { db, service } = await started([reply('좋다.')]);
    await service.send('u1', { text: '\ud83d  안녕  \ud83d' }, later(1));
    expect(db.galpiMessages.find((m) => m.sender === 'user')?.content).toBe('안녕');
  });

  it('깨진 글자뿐인 말은 빈 말이다 — 아무것도 저장하지 않는다', async () => {
    const { db, llm, service } = await started();
    await expect(service.send('u1', { text: ' \ud83d\u0000 ' }, later(1))).rejects.toMatchObject({ code: ErrorCode.VALIDATION_ERROR });
    expect(db.galpiMessages.filter((m) => m.sender === 'user')).toHaveLength(0);
    expect(llm.calls).toHaveLength(0);
  });

  it('1000자 한도는 코드 포인트로 센다 — 이모지를 반으로 가르지 않는다', async () => {
    const { db, service } = await started([reply('와.')]);
    await service.send('u1', { text: `가${'🙂'.repeat(1000)}` }, later(1));
    const saved = db.galpiMessages.find((m) => m.sender === 'user')?.content ?? '';
    expect([...saved]).toHaveLength(1000);
    expect(wellFormed(saved)).toBe(true);
  });

  it('갈피 답 말풍선의 짝 없는 서로게이트는 빼고 저장한다', async () => {
    const { db, service } = await started([reply('좋\ud83d다 🙂')]);
    const result = await service.send('u1', { text: '산책했어요' }, later(1));
    expect(result.messages[1].text).toBe('좋다 🙂');
    expect(db.galpiMessages.every((m) => wellFormed(m.content))).toBe(true);
  });

  it('서로게이트 하나뿐인 말풍선은 비어 버리니 버리고, 한 번 다시 묻는다', async () => {
    const { db, llm, service } = await started([reply('\ud83d'), reply('다시 말해 볼게요.')]);
    const result = await service.send('u1', { text: '산책했어요' }, later(1));
    expect(llm.calls).toHaveLength(2);
    expect(result.messages[1].text).toBe('다시 말해 볼게요.');
    expect(db.galpiMessages.every((m) => wellFormed(m.content))).toBe(true);
  });
});

describe('같은 요청이 겹칠 때 (리뷰 2)', () => {
  it('말 놓기는 두 요청이 동시에 와도 한 번만 꺼낸다', async () => {
    const casual = reply('오, 그랬구나.', { signals: { userUsedCasual: true, crisis: 'none' } });
    const { db, service } = await started([casual, casual]);
    await Promise.all([service.send('u1', { text: 'ㅇㅇ 피곤해' }, later(1)), service.send('u1', { text: 'ㅇㅇ 진짜' }, later(1))]);
    expect(db.galpiMessages.filter((m) => m.content === GALPI_COPY.speechOffer)).toHaveLength(1);
    expect(db.galpiStates[0].casualOfferedAt).toEqual(later(1));
  });
});

describe('말 주고받기 — 더 살펴볼 것', () => {
  it('동의를 철회했으면 말을 받지 않고 LLM 도 부르지 않는다 (CLAUDE.md 10.2c)', async () => {
    const { db, llm, service } = await started();
    db.users[0].consents.push({ consentType: 'sensitive_info', agreed: false, agreedAt: new Date('2026-10-05T00:00:00Z') });
    await expect(service.send('u1', { text: '안녕' }, later(1))).rejects.toMatchObject({ code: ErrorCode.AI_CONSENT_REQUIRED });
    expect(llm.calls).toHaveLength(0);
    expect(db.galpiMessages.filter((m) => m.sender === 'user')).toHaveLength(0);
  });

  it('이전 말도 가명처리해서 보낸다 — 이름·연락처·가린 민감정보 원문이 프롬프트에 없다', async () => {
    const { llm, service } = await started([reply('그렇구나.'), reply('응응.')]);
    await service.send('u1', { text: '저는 지은이에요. 010-1234-5678 로 연락 주세요. 우울증이 있어요' }, later(1));
    await service.send('u1', { text: '지은이는 오늘 걸었어요' }, later(2));
    const prompt = llm.calls[1].messages.map((m) => m.content).join('\n');
    for (const secret of ['지은', '010-1234-5678', '우울증']) expect(prompt).not.toContain(secret);
    expect(prompt).toContain('[이름]');
    expect(prompt).toContain('[연락처]');
  });

  it('버튼은 마지막 말풍선에만 붙는다', async () => {
    const two = JSON.stringify({
      messages: [
        { text: '오, 그렇구나.', expression: 'curious' },
        { text: '담배는 피워요?', expression: null },
      ],
      quickReply: { type: 'practical', fact: 'smoking' },
      signals: { userUsedCasual: false, crisis: 'none' },
    });
    const { db, service } = await started([two]);
    const result = await service.send('u1', { text: '연애 얘기 해요' }, later(1));
    expect(result.messages.map((m) => m.quickReply?.fact)).toEqual([undefined, undefined, 'smoking']);
    expect(db.galpiMessages.filter((m) => m.quickReply)).toHaveLength(1);
  });

  it('LLM 이 실패해도 내 말은 남고, 로그와 응답에는 오류 문구도 말도 없다 (CLAUDE.md 10.3)', async () => {
    const failing: LlmProvider = { complete: () => Promise.reject(new Error('quota exceeded 퇴근하고 걸어요 010-1234-5678')) };
    const { db, service } = await started([], {}, failing);
    const result = await service.send('u1', { text: '퇴근하고 걸어요' }, later(1));
    expect(db.galpiMessages.some((m) => m.sender === 'user' && m.content === '퇴근하고 걸어요')).toBe(true);
    expect(JSON.stringify(result)).not.toContain('quota');
    expect(warned()).toContain('user=u1');
    expect(warned()).not.toContain('quota');
    expect(warned()).not.toContain('퇴근하고');
    expect(warned()).not.toContain('010');
  });

  it('답을 준비하다 오류가 나도 내 말은 이미 저장돼 있고 한 턴으로 센다', async () => {
    const { db, wiki, service } = await started();
    vi.spyOn(wiki, 'snapshot').mockRejectedValue(new Error('db down'));
    await expect(service.send('u1', { text: '퇴근하고 걸어요' }, later(1))).rejects.toThrow('db down');
    expect(db.galpiMessages.some((m) => m.sender === 'user' && m.content === '퇴근하고 걸어요')).toBe(true);
    expect(db.galpiStates[0].userTurns).toBe(1);
  });

  it('읽을 수 없는 답이 두 번 오면 로그에 사용자 ID 만 남긴다', async () => {
    const { service } = await started(['안녕하세요!', '```\n깨진 답\n```']);
    await service.send('u1', { text: '퇴근하고 걸어요' }, later(1));
    expect(warned()).toContain('user=u1');
    expect(warned()).not.toContain('퇴근하고');
    expect(warned()).not.toContain('깨진');
  });

  it('서고 수집이 실패해도 대화는 이어지고, 로그에는 사용자 ID 만 남는다', async () => {
    const { ingest, service } = await started(Array.from({ length: 4 }, () => reply('그렇구나.')));
    ingest.runForUser.mockRejectedValue(new Error('boom 이야기 3'));
    for (let i = 1; i <= 4; i += 1) await service.send('u1', { text: `이야기 ${i}` }, later(i));
    await new Promise((resolve) => setImmediate(resolve));
    expect(ingest.runForUser).toHaveBeenCalledTimes(1);
    expect(warned()).toContain('inline ingest failed user=u1');
    expect(warned()).not.toContain('boom');
    expect(warned()).not.toContain('이야기');
  });
});

describe('갈피 답 받기 (reply-llm — 먼저 말 걸기도 쓴다)', () => {
  const messages: LlmMessage[] = [
    { role: 'system', content: '규칙' },
    { role: 'user', content: '안녕' },
  ];
  const noQuickWord = (text: string) => (text.includes('빨리') ? ['빨리'] : []);
  const request = { userId: 'u1', purpose: 'reply' as const, messages };
  const signal = (crisis: string) => ({ signals: { userUsedCasual: false, crisis } });

  it('extraBanned 가 찾은 말이 있으면 그 말을 알리고 한 번 다시 묻는다', async () => {
    const llm = new MockLlmProvider({ responses: [reply('오늘은 빨리 와요.'), reply('오늘은 천천히 와요.')] });
    const { reply: accepted, crisis } = await completeReply(llm, { userId: 'u1', purpose: 'proactive', messages }, noQuickWord);
    expect(accepted?.bubbles[0].text).toBe('오늘은 천천히 와요.');
    expect(crisis).toBe('none');
    expect(llm.calls.map((call) => call.purpose)).toEqual(['proactive', 'proactive']);
    expect(llm.calls[1].messages[llm.calls[1].messages.length - 1].content).toContain('쓰지 않는 말(빨리)');
    // 다시 묻는 말은 원래 대화 뒤에 덧붙는다 — 원래 요청은 바뀌지 않는다
    expect(llm.calls[1].messages.slice(0, messages.length)).toEqual(messages);
  });

  it('두 번째도 안 되면 reply 가 null 이다 — 세 번째는 묻지 않는다', async () => {
    const llm = new MockLlmProvider({ responses: [reply('빨리 와요.'), reply('빨리 와요.'), reply('천천히 와요.')] });
    expect(await completeReply(llm, { userId: 'u1', purpose: 'proactive', messages }, noQuickWord)).toEqual({ reply: null, crisis: 'none' });
    expect(llm.calls).toHaveLength(2);
  });

  it('LLM 이 실패하면 다시 묻지 않고 reply 가 null, 신호는 없다', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('down'));
    expect(await completeReply({ complete }, request)).toEqual({ reply: null, crisis: 'none' });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('받아들인 답이면 crisis 는 그 답이 알린 신호와 같다', async () => {
    const llm = new MockLlmProvider({ responses: [reply('많이 무서웠겠어요.', signal('danger'))] });
    const { reply: accepted, crisis } = await completeReply(llm, request);
    expect(crisis).toBe('danger');
    expect(accepted?.signals.crisis).toBe('danger');
    expect(llm.calls).toHaveLength(1);
  });

  it.each([
    ['self_harm', 'none', 'self_harm'],
    ['none', 'self_harm', 'self_harm'],
    ['danger', 'self_harm', 'self_harm'],
    ['self_harm', 'danger', 'self_harm'],
    ['danger', 'none', 'danger'],
    ['none', 'danger', 'danger'],
    ['none', 'none', 'none'],
  ])('두 답이 모두 금지 표현으로 버려져도 신호는 남는다 — 첫 답 %s, 둘째 답 %s → %s (self_harm > danger > none)', async (first, second, expected) => {
    const llm = new MockLlmProvider({ responses: [reply('운명 같은 말.', signal(first)), reply('운명 같은 말.', signal(second))] });
    expect(await completeReply(llm, request)).toEqual({ reply: null, crisis: expected });
  });

  it('extraBanned 로 버려진 답이 알린 신호도 남는다', async () => {
    const llm = new MockLlmProvider({ responses: [reply('빨리 와요.', signal('self_harm')), reply('빨리 와요.')] });
    expect(await completeReply(llm, { ...request, purpose: 'proactive' }, noQuickWord)).toEqual({ reply: null, crisis: 'self_harm' });
  });

  it('읽을 수 없는 시도는 신호가 없다 — 읽은 시도가 알린 신호만 센다', async () => {
    const llm = new MockLlmProvider({ responses: ['안녕하세요!', reply('운명 같은 말.', signal('danger'))] });
    expect(await completeReply(llm, request)).toEqual({ reply: null, crisis: 'danger' });
  });

  it('다시 물어 받은 답이 괜찮아도 버려진 첫 답의 더 강한 신호가 남고, 받아들인 답의 신호도 그 값으로 맞춘다', async () => {
    const llm = new MockLlmProvider({ responses: [reply('운명 같은 말.', signal('self_harm')), reply('힘들었겠어요.', signal('danger'))] });
    const { reply: accepted, crisis } = await completeReply(llm, request);
    expect(accepted?.bubbles[0].text).toBe('힘들었겠어요.');
    expect(crisis).toBe('self_harm');
    expect(accepted?.signals.crisis).toBe('self_harm');
  });

  it('버려진 첫 답이 신호를 알리고 다시 묻다가 LLM 이 실패해도 신호는 남는다', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ content: reply('운명 같은 말.', signal('self_harm')), inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 })
      .mockRejectedValue(new Error('down'));
    expect(await completeReply({ complete }, request)).toEqual({ reply: null, crisis: 'self_harm' });
    expect(complete).toHaveBeenCalledTimes(2);
  });
});
