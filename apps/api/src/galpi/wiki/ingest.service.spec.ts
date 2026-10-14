import { Logger } from '@nestjs/common';
import { type LlmCompletionRequest, type LlmCompletionResult, type LlmProvider, MockLlmProvider } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { GalpiAccessService } from '../access.service';
import type { KnownService } from '../known.service';
import { FakePrisma, type FakeUserInput } from '../testing/fake-prisma';
import { IngestService } from './ingest.service';
import { WikiService } from './wiki.service';

const T = (minute: number) => new Date(Date.UTC(2026, 9, 11, 3, minute));
const EMPTY = JSON.stringify({ claims: [], facts: [] });
const result = (content: string): LlmCompletionResult => ({ content, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 });

/** 다른 사용자의 대화 — 갈피가 묻고 사용자가 답했고, 대화는 멈춰 있다. 사용자 말의 id 를 돌려준다 */
async function addChat(db: FakePrisma, user: FakeUserInput, text = '퇴근하고 걸어요'): Promise<string> {
  db.addUser({ displayName: '수지', ...user });
  await db.galpiState.create({ data: { userId: user.id, turnsSinceIngest: 2, lastUserMessageAt: T(2) } });
  await db.galpiMessage.create({ data: { userId: user.id, sender: 'galpi', content: '요즘 퇴근하고 뭐 해요?', createdAt: T(0) } });
  return (await db.galpiMessage.create({ data: { userId: user.id, sender: 'user', content: text, createdAt: T(1) } })).id;
}

describe('서고 수집 실행', () => {
  let db: FakePrisma;
  let known: { checkAndMarkKnown: ReturnType<typeof vi.fn> };
  let galpiMessageId: string;
  let userMessageId: string;
  let skippedMessageId: string;
  // 로그가 테스트 출력에 섞이지 않게 막고, 무엇을 남겼는지 확인한다
  let log: MockInstance<Logger['log']>;
  let warn: MockInstance<Logger['warn']>;
  let debug: MockInstance<Logger['debug']>;

  beforeEach(async () => {
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    debug = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    db = new FakePrisma();
    db.addUser({ id: 'u1', displayName: '지은' });
    await db.galpiState.create({ data: { userId: 'u1', turnsSinceIngest: 4, lastUserMessageAt: T(2) } });
    galpiMessageId = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '요즘 퇴근하고 뭐 해요?', createdAt: T(0) } })).id;
    userMessageId = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '저는 지은이고 퇴근하고 걸어요', createdAt: T(1) } })).id;
    skippedMessageId = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '다른 얘기 할래요', skipped: true, createdAt: T(2) } })).id;
    known = { checkAndMarkKnown: vi.fn().mockResolvedValue(false) };
  });

  afterEach(() => {
    log.mockRestore();
    warn.mockRestore();
    debug.mockRestore();
  });

  const service = (llm: LlmProvider) => {
    const prisma = db as unknown as PrismaService;
    return new IngestService(prisma, llm, known as unknown as KnownService, new GalpiAccessService(prisma));
  };

  const addReply = () =>
    JSON.stringify({ claims: [{ op: 'add', page: 'now', text: '퇴근 뒤에는 걷는다', sources: [userMessageId] }], facts: [{ key: 'company', value: 'A사' }] });

  it('문장과 출처를 더하고, 수집 시각·턴 수를 정리하고, 알게 됨을 본다', async () => {
    await service(new MockLlmProvider({ responses: [addReply()] })).runForUser('u1', T(30));
    expect(db.wikiClaims.map((c) => c.text)).toEqual(['퇴근 뒤에는 걷는다']);
    expect(db.wikiClaimSources).toEqual([{ claimId: db.wikiClaims[0].id, messageId: userMessageId }]);
    expect(db.profileFacts[0]).toMatchObject({ key: 'company', value: 'A사', letterAllowed: null });
    expect(db.galpiStates[0]).toMatchObject({ lastIngestAt: T(2), turnsSinceIngest: 0 });
    expect(known.checkAndMarkKnown).toHaveBeenCalledWith('u1', T(30));
  });

  it('LLM 에는 가명처리한 말만 가고, 건너뛰기는 빠진다', async () => {
    const llm = new MockLlmProvider({ responses: [addReply()] });
    await service(llm).runForUser('u1', T(30));
    const prompt = llm.calls[0].messages.map((m) => m.content).join('\n');
    expect(prompt).toContain(`[${userMessageId}] 나: 저는 [이름]이고 퇴근하고 걸어요`);
    expect(prompt).not.toContain('지은');
    expect(prompt).not.toContain('다른 얘기 할래요');
    expect(llm.calls[0]).toMatchObject({ purpose: 'ingest', userId: 'u1', responseFormat: 'json' });
  });

  it('연락처가 든 말은 연락처를 지워서 보낸다', async () => {
    await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '제 번호는 010-1234-5678 이에요', createdAt: T(3) } });
    const llm = new MockLlmProvider({ respond: () => EMPTY });
    await service(llm).runForUser('u1', T(30));
    const prompt = llm.calls[0].messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('제 번호는 [연락처] 이에요');
    expect(prompt).not.toContain('010-1234-5678');
  });

  it('이모티콘과 안전 안내는 보내지 않는다 — 글로 나눈 대화만 정리한다', async () => {
    await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', kind: 'emoticon', content: 'proud', expression: 'proud', createdAt: T(3) } });
    await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '많이 힘들 때 도움받을 곳을 알려 드릴게요', safety: true, createdAt: T(4) } });
    const llm = new MockLlmProvider({ respond: () => EMPTY });
    await service(llm).runForUser('u1', T(30));
    const prompt = llm.calls[0].messages[1].content;
    expect(prompt).toContain(`[${userMessageId}] 나:`);
    expect(prompt).not.toContain('proud');
    expect(prompt).not.toContain('도움받을 곳');
    // 묶음의 끝은 정리한 마지막 글 — 보내지 않은 줄은 끝이 되지 않는다
    expect(db.galpiStates[0].lastIngestAt).toEqual(T(2));
  });

  it('서고에는 이름 자리표시자를 벗기고 가려진 말을 따라 쓴 글을 뺀 문장이 남는다 — 문장도 조건 정보 값도', async () => {
    const llm = new MockLlmProvider({
      responses: [
        JSON.stringify({
          claims: [
            { op: 'add', page: 'now', text: '[이름]은 퇴근 뒤에 걷는다', sources: [userMessageId] },
            { op: 'add', page: 'people', text: '{name}의 친구들은 차분하다고 한다', sources: [userMessageId] },
            { op: 'add', page: 'people', text: '[이름]이라고 불리는 걸 좋아한다', sources: [userMessageId] },
            { op: 'add', page: 'relationship', text: '연락은 [연락처] 로 한다', sources: [userMessageId] },
          ],
          facts: [
            { key: 'housing', value: '[이름]의 전세 아파트' },
            { key: 'school', value: '[민감정보:사상·신념] 부설 대학교' },
          ],
        }),
      ],
    });
    await service(llm).runForUser('u1', T(30));
    // 말이 깨지는 셋째 문장과 연락처 이름표가 든 넷째 문장, 민감정보 이름표가 든 값은 남기지 않는다
    expect(db.wikiClaims.map((c) => c.text)).toEqual(['퇴근 뒤에 걷는다', '친구들은 차분하다고 한다']);
    expect(db.profileFacts.map((f) => [f.key, f.value])).toEqual([['housing', '전세 아파트']]);
    const stored = JSON.stringify([db.wikiClaims, db.profileFacts]);
    for (const left of ['[이름]', '{name}', '[연락처]', '[민감정보:']) expect(stored).not.toContain(left);
  });

  describe('바로 앞 대화 (묶음 사이의 흐름)', () => {
    it('처음 정리할 때는 앞 대화가 없고, 다음 수집부터 앞 묶음의 끝이 따라간다', async () => {
      const llm = new MockLlmProvider({ respond: () => EMPTY });
      const svc = service(llm);
      await svc.runForUser('u1', T(30));
      expect(llm.calls[0].messages[1].content).not.toContain('[바로 앞 대화]');

      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '아침에도 걸어요', createdAt: T(40) } });
      await svc.runForUser('u1', T(50));
      // 첫 묶음은 T(2) 에서 끝났다 — 건너뛴 말(T(2))은 빠지고 그 앞 두 줄이 따라간다
      expect(llm.calls[1].messages[1].content).toContain('[바로 앞 대화]\n갈피: 요즘 퇴근하고 뭐 해요?\n나: 저는 [이름]이고 퇴근하고 걸어요\n\n[새 대화]\n');
    });

    it('앞 묶음이 갈피의 질문으로 끝났으면 그 질문이 따라간다 — 나중에 한 대답을 이해하게', async () => {
      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '그럼 주말에는 뭐 해요?', createdAt: T(3) } });
      db.galpiStates[0].lastIngestAt = T(3); // 앞 묶음은 이 질문에서 끝났다
      const answer = await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '주말에는 산에 가요', createdAt: T(40) } });
      const llm = new MockLlmProvider({ respond: () => EMPTY });
      await service(llm).runForUser('u1', T(50));
      expect(llm.calls[0].messages[1].content).toContain(
        `[바로 앞 대화]\n나: 저는 [이름]이고 퇴근하고 걸어요\n갈피: 그럼 주말에는 뭐 해요?\n\n[새 대화]\n[${answer.id}] 나: 주말에는 산에 가요`,
      );
    });

    it('앞 대화에도 다른 사람의 말은 들어가지 않는다', async () => {
      db.addUser({ id: 'u2', displayName: '민수' });
      await db.galpiState.create({ data: { userId: 'u2', lastUserMessageAt: T(2) } });
      await db.galpiMessage.create({ data: { userId: 'u2', sender: 'galpi', content: '남의 질문: 새벽엔 뭐 해요?', createdAt: T(-1) } });
      await db.galpiMessage.create({ data: { userId: 'u2', sender: 'user', content: '남의 대답: 한강을 달려요', createdAt: T(0) } });
      db.galpiStates[0].lastIngestAt = T(0);
      const llm = new MockLlmProvider({ respond: () => EMPTY });
      await service(llm).runForUser('u1', T(30));
      const prompt = llm.calls[0].messages[1].content;
      // u1 의 앞 대화는 자기 질문 하나뿐이다
      expect(prompt).toContain('[바로 앞 대화]\n갈피: 요즘 퇴근하고 뭐 해요?\n\n[새 대화]\n');
      for (const others of ['남의 질문', '남의 대답', '한강', '민수']) expect(prompt).not.toContain(others);
    });

    it('가장 가까운 두 줄만, 글로 나눈 것만 — 건너뛴 말·이모티콘·안전 안내는 빠지고 가명처리하며, 근거로는 댈 수 없다', async () => {
      const line = (data: Record<string, unknown>) => db.galpiMessage.create({ data: { userId: 'u1', ...data } });
      await line({ sender: 'galpi', content: '오래전 질문이에요', createdAt: T(-8) });
      const contextUser = await line({ sender: 'user', content: '지은이라고 불러 주세요', createdAt: T(-6) });
      await line({ sender: 'user', content: '다른 얘기 할래요', skipped: true, createdAt: T(-4) });
      await line({ sender: 'galpi', kind: 'emoticon', content: 'proud', expression: 'proud', createdAt: T(-3) });
      await line({ sender: 'galpi', content: '많이 힘들 때 도움받을 곳을 알려 드릴게요', safety: true, createdAt: T(-2) });
      db.galpiStates[0].lastIngestAt = T(0);
      const llm = new MockLlmProvider({
        responses: [
          JSON.stringify({
            claims: [
              { op: 'add', page: 'now', text: '앞 대화를 근거로 댔다', sources: [contextUser.id] },
              { op: 'add', page: 'now', text: '새 말이 근거다', sources: [contextUser.id, userMessageId] },
            ],
            facts: [],
          }),
        ],
      });
      await service(llm).runForUser('u1', T(30));

      const prompt = llm.calls[0].messages[1].content;
      // 앞 대화는 가까운 두 줄(오래된 것부터)이고, 새 대화는 그 뒤의 것이다 — 겹치지 않는다
      expect(prompt).toContain(`[바로 앞 대화]\n나: [이름]이라고 불러 주세요\n갈피: 요즘 퇴근하고 뭐 해요?\n\n[새 대화]\n[${userMessageId}] 나: 저는 [이름]이고 퇴근하고 걸어요`);
      for (const left of ['오래전 질문', '다른 얘기', 'proud', '도움받을 곳', '지은', contextUser.id]) expect(prompt).not.toContain(left);
      // 앞 대화의 말은 id 가 없어 근거가 될 수 없다 — 지어서 대도 버린다
      expect(db.wikiClaims.map((c) => c.text)).toEqual(['새 말이 근거다']);
      expect(db.wikiClaimSources).toEqual([{ claimId: db.wikiClaims[0].id, messageId: userMessageId }]);
    });
  });

  it('새 사용자 말이 없으면 LLM 을 부르지 않는다', async () => {
    const llm = new MockLlmProvider({ responses: [addReply(), addReply()] });
    await service(llm).runForUser('u1', T(30));
    await service(llm).runForUser('u1', T(31));
    expect(llm.calls).toHaveLength(1);
  });

  it('갈피 말과 건너뛴 말뿐이어도 LLM 을 부르지 않는다 — 수집 시각만 끝까지 넘긴다', async () => {
    db.galpiStates[0].lastIngestAt = T(1);
    const llm = new MockLlmProvider({ respond: addReply });
    const svc = service(llm);
    await svc.runForUser('u1', T(30));
    expect(db.galpiStates[0].lastIngestAt).toEqual(T(2)); // 건너뛴 말(T(2))까지
    await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '그럼 다음에 얘기해요', createdAt: T(3) } });
    await svc.runForUser('u1', T(31));
    expect(db.galpiStates[0].lastIngestAt).toEqual(T(3));
    expect(llm.calls).toHaveLength(0);
    expect(db.wikiClaims).toEqual([]);
    expect(known.checkAndMarkKnown).not.toHaveBeenCalled();
  });

  describe('정리할 사용자 말이 없는 묶음', () => {
    const at = (i: number) => new Date(T(0).getTime() + i * 1000);
    const stateOf = (userId: string) => db.galpiStates.find((s) => s.userId === userId);

    // 건너뛴 말·갈피 말 41줄 뒤에 진짜 말 하나 — 창(40줄)이 앞 줄들로 가득 차 뒤의 말에 닿지 못하던 모양
    async function stalled(): Promise<string> {
      db.galpiStates[0].lastIngestAt = T(2); // u1 은 정리를 마쳤다
      db.addUser({ id: 'u2' });
      await db.galpiState.create({ data: { userId: 'u2', lastUserMessageAt: at(41) } });
      for (let i = 0; i < 41; i += 1) {
        await db.galpiMessage.create({
          data:
            i % 2 === 0
              ? { userId: 'u2', sender: 'galpi', content: `질문 ${i}`, createdAt: at(i) }
              : { userId: 'u2', sender: 'user', content: '다른 얘기 할래요', skipped: true, createdAt: at(i) },
        });
      }
      return (await db.galpiMessage.create({ data: { userId: 'u2', sender: 'user', content: '이제 진짜 이야기예요', createdAt: at(41) } })).id;
    }

    it('건너뛴 말·갈피 말이 창을 채워도 수집 시각을 넘겨 뒤의 말에 닿는다 — LLM 없이 넘기고 세지 않는다', async () => {
      const realId = await stalled();
      const llm = new MockLlmProvider({ respond: () => EMPTY });
      const svc = service(llm);

      // 첫 수집: 창의 40줄이 모두 건너뛴 말과 갈피 말이다 — LLM 을 부르지 않고 40번째 줄까지 넘긴다
      expect(await svc.sweep(new Date(at(41).getTime() + 11 * 60_000))).toBe(0);
      expect(llm.calls).toHaveLength(0);
      expect(stateOf('u2')?.lastIngestAt).toEqual(at(39));
      expect(known.checkAndMarkKnown).not.toHaveBeenCalled();

      // 다음 수집: 뒤의 진짜 말에 닿아 정리한다
      expect(await svc.sweep(new Date(at(41).getTime() + 22 * 60_000))).toBe(1);
      expect(llm.calls).toHaveLength(1);
      expect(llm.calls[0].messages[1].content).toContain(`[${realId}] 나: 이제 진짜 이야기예요`);
      expect(stateOf('u2')?.lastIngestAt).toEqual(at(41));
    });

    it('넘긴 줄 가운데 갈피의 질문은 다음 수집의 바로 앞 대화로 따라간다 — 나중에 한 대답을 이해하게', async () => {
      db.galpiStates[0].lastIngestAt = T(2);
      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'galpi', content: '그럼 주말에는 뭐 해요?', createdAt: T(3) } });
      await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '다른 얘기 할래요', skipped: true, createdAt: T(4) } });
      const llm = new MockLlmProvider({ respond: () => EMPTY });
      const svc = service(llm);
      await svc.runForUser('u1', T(30));
      expect(llm.calls).toHaveLength(0);
      expect(db.galpiStates[0].lastIngestAt).toEqual(T(4));

      const answer = await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '주말에는 산에 가요', createdAt: T(40) } });
      await svc.runForUser('u1', T(50));
      expect(llm.calls[0].messages[1].content).toContain(
        `[바로 앞 대화]\n나: 저는 [이름]이고 퇴근하고 걸어요\n갈피: 그럼 주말에는 뭐 해요?\n\n[새 대화]\n[${answer.id}] 나: 주말에는 산에 가요`,
      );
    });

    it('다른 곳이 이미 차지했으면 수집 시각을 건드리지 않는다', async () => {
      db.galpiStates[0].lastIngestAt = T(1); // 건너뛴 말(T(2)) 하나가 남아 있다
      const claimedElsewhere = service(new MockLlmProvider({ respond: () => EMPTY }));
      // 읽은 뒤 차지하기 전에 다른 서버가 수집 시각을 옮긴 것을 흉내 낸다
      const original = db.galpiState.updateMany;
      db.galpiState.updateMany = async (args) => {
        db.galpiStates[0].lastIngestAt = T(9);
        return original(args);
      };
      await claimedElsewhere.runForUser('u1', T(30));
      expect(db.galpiStates[0].lastIngestAt).toEqual(T(9));
    });
  });

  it('두 곳에서 동시에 돌려도 한 번만 정리한다 (리뷰 4)', async () => {
    const llm = new MockLlmProvider({ responses: [addReply(), addReply()] });
    await Promise.all([service(llm).runForUser('u1', T(30)), service(llm).runForUser('u1', T(30))]);
    expect(llm.calls).toHaveLength(1);
    expect(db.wikiClaims).toHaveLength(1);
  });

  it('LLM 을 부르기 전에 묶음을 먼저 차지한다 (리뷰 4)', async () => {
    let claimedWhenCalled: Date | null = null;
    const probe: LlmProvider = {
      complete: async () => {
        claimedWhenCalled = db.galpiStates[0].lastIngestAt;
        return result(EMPTY);
      },
    };
    await service(probe).runForUser('u1', T(30));
    expect(claimedWhenCalled).toEqual(T(2));
  });

  it('갈피를 시작하지 않은 사람과 없는 사용자는 건너뛴다', async () => {
    db.addUser({ id: 'u3' }); // 동의는 했지만 대화가 한 번도 없어 상태가 없다
    const llm = new MockLlmProvider({ respond: addReply });
    await expect(service(llm).runForUser('u3', T(30))).resolves.toBeUndefined();
    await expect(service(llm).runForUser('nobody', T(30))).resolves.toBeUndefined();
    expect(llm.calls).toHaveLength(0);
    expect(db.galpiStates.map((s) => s.userId)).toEqual(['u1']);
    expect(known.checkAndMarkKnown).not.toHaveBeenCalled();
  });

  it('LLM 이 실패하면 차지한 묶음을 돌려놓고 실패를 알린다', async () => {
    let calls = 0;
    const flaky: LlmProvider = {
      complete: async () => {
        calls += 1;
        if (calls === 1) throw new Error('llm down');
        return result(addReply());
      },
    };
    const svc = service(flaky);
    await expect(svc.runForUser('u1', T(30))).rejects.toThrow('llm down');
    expect(db.galpiStates[0]).toMatchObject({ lastIngestAt: null, turnsSinceIngest: 4 });
    expect(db.wikiClaims).toEqual([]);
    expect(known.checkAndMarkKnown).not.toHaveBeenCalled();
    // 돌려놓았고 겹침 표시도 풀렸으니, 같은 서버의 다음 수집이 같은 묶음을 다시 정리한다
    await svc.runForUser('u1', T(31));
    expect(db.wikiClaims.map((c) => c.text)).toEqual(['퇴근 뒤에는 걷는다']);
    expect(db.galpiStates[0]).toMatchObject({ lastIngestAt: T(2), turnsSinceIngest: 0 });
  });

  it('저장이 실패해도 차지한 묶음을 돌려놓고 다시 던진다 — 서고에는 아무것도 남지 않는다', async () => {
    db.$transaction = () => Promise.reject(new Error('tx failed'));
    await expect(service(new MockLlmProvider({ responses: [addReply()] })).runForUser('u1', T(30))).rejects.toThrow('tx failed');
    expect(db.galpiStates[0]).toMatchObject({ lastIngestAt: null, turnsSinceIngest: 4 });
    expect(db.wikiClaims).toEqual([]);
    expect(db.profileFacts).toEqual([]);
    expect(known.checkAndMarkKnown).not.toHaveBeenCalled();
  });

  it('같은 서버에서 그 사람의 수집이 돌고 있으면 겹쳐 돌리지 않는다', async () => {
    let release: (content: string) => void = () => undefined;
    const slow = {
      calls: 0,
      complete() {
        slow.calls += 1;
        return new Promise<LlmCompletionResult>((resolve) => {
          release = (content) => resolve({ content, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 });
        });
      },
    };
    const svc = service(slow);
    const first = svc.runForUser('u1', T(30));
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 첫 수집이 LLM 을 기다리는 동안 새 말이 오고 수집이 또 불린다
    await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '새 이야기', createdAt: T(31) } });
    await svc.runForUser('u1', T(31));
    release(JSON.stringify({ claims: [], facts: [] }));
    await first;
    expect(slow.calls).toBe(1);
  });

  it('출처는 이번 묶음의 사용자 말만 — 갈피 말·건너뛴 말·다른 사람의 말을 대면 그 문장은 버린다', async () => {
    const othersMessageId = await addChat(db, { id: 'u2' });
    const llm = new MockLlmProvider({
      responses: [
        JSON.stringify({
          claims: [
            { op: 'add', page: 'now', text: '갈피 말을 출처로 댔다', sources: [galpiMessageId] },
            { op: 'add', page: 'now', text: '건너뛴 말을 출처로 댔다', sources: [skippedMessageId] },
            { op: 'add', page: 'now', text: '남의 말을 출처로 댔다', sources: [othersMessageId] },
            { op: 'add', page: 'now', text: '사용자 말이 출처다', sources: [galpiMessageId, userMessageId] },
          ],
          facts: [],
        }),
      ],
    });
    await service(llm).runForUser('u1', T(30));
    expect(db.wikiClaims.map((c) => c.text)).toEqual(['사용자 말이 출처다']);
    expect(db.wikiClaimSources).toEqual([{ claimId: db.wikiClaims[0].id, messageId: userMessageId }]);
  });

  it('다른 사람의 서고·조건 정보·대화는 프롬프트에 들어가지 않는다', async () => {
    const othersMessageId = await addChat(db, { id: 'u2', displayName: '민수' }, '새벽에 한강을 달려요');
    await db.wikiClaim.create({ data: { userId: 'u2', page: 'now', text: '남의 문장: 새벽에 달린다', sources: { create: [{ messageId: othersMessageId }] } } });
    await db.profileFact.upsert({
      where: { userId_key: { userId: 'u2', key: 'company' } },
      create: { userId: 'u2', key: 'company', value: '남의 회사', letterAllowed: true },
      update: {},
    });
    const llm = new MockLlmProvider({ respond: () => EMPTY });
    await service(llm).runForUser('u1', T(30));
    const prompt = llm.calls[0].messages.map((m) => m.content).join('\n');
    for (const others of ['남의 문장', '남의 회사', '한강', '민수', othersMessageId]) expect(prompt).not.toContain(others);
    // 그 사람의 것은 그대로다 — 수집 시각도 건드리지 않았다
    expect(db.galpiStates.find((s) => s.userId === 'u2')?.lastIngestAt).toBeNull();
  });

  it('실패해서 차지를 돌려놓을 때도 그 사람의 수집 시각만 되돌린다', async () => {
    await addChat(db, { id: 'u2' });
    const other = db.galpiStates.find((s) => s.userId === 'u2');
    if (!other) throw new Error('u2 state missing');
    other.lastIngestAt = T(2); // u1 의 묶음 끝과 같은 시각
    const failing = { complete: () => Promise.reject(new Error('llm down')) };
    await expect(service(failing).runForUser('u1', T(30))).rejects.toThrow('llm down');
    expect(other.lastIngestAt).toEqual(T(2));
    expect(db.galpiStates[0].lastIngestAt).toBeNull();
  });

  describe('이미 있는 서고', () => {
    // 이전 수집이 끝난 뒤의 상태 — 문장 둘(같은 옛 원문에서 나왔다)과, 편지에 적어도 된다고 한 조건 정보 하나
    let earlierId: string;
    let keepId: string;
    let dropId: string;

    beforeEach(async () => {
      earlierId = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '예전 이야기', createdAt: T(-5) } })).id;
      keepId = (await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '주말마다 자주 걷는다', sources: { create: [{ messageId: earlierId }] } } })).id;
      dropId = (await db.wikiClaim.create({ data: { userId: 'u1', page: 'people', text: '친구가 많다', sources: { create: [{ messageId: earlierId }] } } })).id;
      await db.profileFact.upsert({
        where: { userId_key: { userId: 'u1', key: 'company' } },
        create: { userId: 'u1', key: 'company', value: 'B사', letterAllowed: true },
        update: {},
      });
      db.galpiStates[0].lastIngestAt = T(0);
    });

    it('기존 문장은 id 와 함께 프롬프트로 가고, 고치기·빼기·조건 정보 갱신이 서고에 반영된다 — 본인이 정한 허락은 그대로 둔다', async () => {
      const llm = new MockLlmProvider({
        responses: [
          JSON.stringify({
            claims: [
              { op: 'update', id: keepId, text: '예전엔 자주 걸었는데 요즘은 퇴근 뒤에만 걷는다', sources: [userMessageId] },
              { op: 'remove', id: dropId },
            ],
            facts: [{ key: 'company', value: 'A사' }],
          }),
        ],
      });
      await service(llm).runForUser('u1', T(30));

      const prompt = llm.calls[0].messages[1].content;
      expect(prompt).toContain(`(${keepId}) [now] 주말마다 자주 걷는다`);
      expect(prompt).toContain(`(${dropId}) [people] 친구가 많다`);
      expect(prompt).toContain('- company: B사');
      expect(db.wikiClaims.map((c) => ({ id: c.id, text: c.text }))).toEqual([{ id: keepId, text: '예전엔 자주 걸었는데 요즘은 퇴근 뒤에만 걷는다' }]);
      // 고친 문장은 옛 출처를 둔 채 새 출처를 더한다. 뺀 문장의 출처는 함께 사라진다
      expect(db.wikiClaimSources).toEqual([
        { claimId: keepId, messageId: earlierId },
        { claimId: keepId, messageId: userMessageId },
      ]);
      expect(db.profileFacts).toHaveLength(1);
      expect(db.profileFacts[0]).toMatchObject({ key: 'company', value: 'A사', letterAllowed: true });
    });

    it('한 장에 15문장이 차 있으면 그 장에는 더하지 않는다 — 다른 장에는 더한다', async () => {
      for (let i = 0; i < 14; i += 1) {
        await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: `채운 문장 ${i}`, sources: { create: [{ messageId: earlierId }] } } });
      }
      // keepId 와 합쳐 now 장이 15문장이다
      const llm = new MockLlmProvider({
        responses: [
          JSON.stringify({
            claims: [
              { op: 'add', page: 'now', text: '열여섯째 문장', sources: [userMessageId] },
              { op: 'add', page: 'people', text: '다른 장의 새 문장', sources: [userMessageId] },
            ],
            facts: [],
          }),
        ],
      });
      await service(llm).runForUser('u1', T(30));
      expect(db.wikiClaims.filter((c) => c.page === 'now')).toHaveLength(15);
      expect(db.wikiClaims.map((c) => c.text)).not.toContain('열여섯째 문장');
      expect(db.wikiClaims.map((c) => c.text)).toContain('다른 장의 새 문장');
    });

    describe('겹치는 문장을 합칠 때 (고치기 + 빼기) — 빠진 문장의 출처는 같은 장에서 고치거나 더한 문장으로 옮긴다', () => {
      let olderId: string;

      /** keepId 와 같은 장(now)에 있는, 다른 옛 원문에서 나온 문장 */
      const addMergeable = async (page: 'now' | 'people', sources: string[]) =>
        (await db.wikiClaim.create({ data: { userId: 'u1', page, text: '퇴근하면 한강을 걷는다', sources: { create: sources.map((messageId) => ({ messageId })) } } })).id;
      const ingestReply = (claims: Record<string, unknown>[]) => new MockLlmProvider({ responses: [JSON.stringify({ claims, facts: [] })] });
      const sourcesOf = (claimId: string) => db.wikiClaimSources.filter((s) => s.claimId === claimId).map((s) => s.messageId);

      beforeEach(async () => {
        olderId = (await db.galpiMessage.create({ data: { userId: 'u1', sender: 'user', content: '퇴근하면 한강을 걸어요', createdAt: T(-4) } })).id;
      });

      it('고친 문장이 빠진 문장의 출처를 이어받고, 그 문장을 갈피 빼기로 지우면 빠진 문장의 원문도 지워진다', async () => {
        const mergedId = await addMergeable('now', [olderId]);
        await service(
          ingestReply([
            { op: 'update', id: keepId, text: '주말마다, 퇴근하면 한강을 걷는다', sources: [userMessageId] },
            { op: 'remove', id: mergedId },
          ]),
        ).runForUser('u1', T(30));

        expect(db.wikiClaims.map((c) => c.id)).not.toContain(mergedId);
        expect(sourcesOf(keepId)).toEqual([earlierId, userMessageId, olderId]);

        // 합친 문장의 내용은 고친 문장에 살아 있다 — 고친 문장을 빼면 그 원문까지 지워져야 빼기가 참이다 (AI 엔진 문서 3.6)
        await new WikiService(db as unknown as PrismaService).removeClaim('u1', keepId);
        expect(db.galpiMessages.map((m) => m.id)).not.toContain(olderId);
      });

      it('같은 장에 새로 더한 문장도 빠진 문장의 출처를 이어받는다', async () => {
        const mergedId = await addMergeable('now', [olderId]);
        await service(
          ingestReply([
            { op: 'remove', id: mergedId },
            { op: 'add', page: 'now', text: '퇴근하면 한강을 걷고 요즘은 아침에도 걷는다', sources: [userMessageId] },
          ]),
        ).runForUser('u1', T(30));

        const added = db.wikiClaims.find((c) => c.text === '퇴근하면 한강을 걷고 요즘은 아침에도 걷는다');
        expect(sourcesOf(added?.id ?? '')).toEqual([userMessageId, olderId]);
        // 고치지 않은 문장은 그대로다
        expect(sourcesOf(keepId)).toEqual([earlierId]);
      });

      it('이미 달린 출처는 다시 달지 않는다 — 같은 출처를 두 번 달면 DB 가 거절하고 묶음이 통째로 실패한다', async () => {
        // 빠지는 두 문장이 모두 keepId 와 같은 옛 원문(earlierId)을 출처로 두고, olderId 도 함께 나눈다
        const first = await addMergeable('now', [earlierId, olderId]);
        const second = await addMergeable('now', [olderId]);
        await service(
          ingestReply([
            { op: 'update', id: keepId, text: '주말마다, 퇴근하면 한강을 걷는다', sources: [userMessageId] },
            { op: 'remove', id: first },
            { op: 'remove', id: second },
          ]),
        ).runForUser('u1', T(30));

        expect(sourcesOf(keepId)).toEqual([earlierId, userMessageId, olderId]);
        expect(db.galpiStates[0].lastIngestAt).toEqual(T(2));
      });

      it('다른 장에서 빠진 문장의 출처는 옮기지 않는다 — 장을 넘는 병합은 보지 않는다', async () => {
        const otherPage = await addMergeable('people', [olderId]);
        await service(
          ingestReply([
            { op: 'update', id: keepId, text: '주말마다, 퇴근하면 한강을 걷는다', sources: [userMessageId] },
            { op: 'remove', id: otherPage },
          ]),
        ).runForUser('u1', T(30));

        expect(db.wikiClaims.map((c) => c.id)).not.toContain(otherPage);
        expect(sourcesOf(keepId)).toEqual([earlierId, userMessageId]);
      });
    });

    it('같은 문장을 두 번 고치라는 답에도 묶음이 실패하지 않는다 — 같은 출처를 두 번 달면 DB 가 거절한다', async () => {
      const llm = new MockLlmProvider({
        responses: [
          JSON.stringify({
            claims: [
              { op: 'update', id: keepId, text: '처음 고친 문장', sources: [userMessageId] },
              { op: 'update', id: keepId, text: '나중에 고친 문장', sources: [userMessageId] },
            ],
            facts: [],
          }),
        ],
      });
      await service(llm).runForUser('u1', T(30));
      expect(db.wikiClaims.map((c) => c.text).sort()).toEqual(['나중에 고친 문장', '친구가 많다']);
      expect(db.wikiClaimSources.filter((s) => s.claimId === keepId).map((s) => s.messageId)).toEqual([earlierId, userMessageId]);
      expect(db.galpiStates[0].lastIngestAt).toEqual(T(2));
    });
  });

  it('한 번에 40개까지 정리하고, 넘친 것은 다음 수집이 이어서 한다', async () => {
    db.addUser({ id: 'u2' });
    const at = (i: number) => new Date(T(0).getTime() + i * 1000);
    await db.galpiState.create({ data: { userId: 'u2', lastUserMessageAt: at(44) } });
    for (let i = 0; i < 45; i += 1) {
      await db.galpiMessage.create({ data: { userId: 'u2', sender: 'user', content: `이야기 ${i}`, createdAt: at(i) } });
    }
    const llm = new MockLlmProvider({ respond: () => EMPTY });
    const sentTexts = (call: number) =>
      llm.calls[call].messages[1].content
        .split('\n')
        .filter((line) => line.includes('] 나: '))
        .map((line) => line.split('] 나: ')[1]);

    await service(llm).runForUser('u2', T(30));
    expect(sentTexts(0)).toEqual(Array.from({ length: 40 }, (_, i) => `이야기 ${i}`));
    expect(db.galpiStates.find((s) => s.userId === 'u2')?.lastIngestAt).toEqual(at(39));

    await service(llm).runForUser('u2', T(31));
    expect(sentTexts(1)).toEqual(['이야기 40', '이야기 41', '이야기 42', '이야기 43', '이야기 44']);
    expect(db.galpiStates.find((s) => s.userId === 'u2')?.lastIngestAt).toEqual(at(44));
  });

  describe('알게 됨 확인이 실패해도', () => {
    it('이미 정리한 것은 그대로 남고, runForUser 는 실패하지 않는다', async () => {
      known.checkAndMarkKnown.mockRejectedValue(new Error('letter llm down'));
      const llm = new MockLlmProvider({ responses: [addReply()] });
      await expect(service(llm).runForUser('u1', T(30))).resolves.toBeUndefined();
      expect(db.wikiClaims.map((c) => c.text)).toEqual(['퇴근 뒤에는 걷는다']);
      expect(db.profileFacts[0]).toMatchObject({ key: 'company', value: 'A사' });
      // 정리는 끝났고 알게 됨만 아직이다 — 다음 수집 때 다시 본다
      expect(db.galpiStates[0]).toMatchObject({ lastIngestAt: T(2), turnsSinceIngest: 0, knownAt: null });
      expect(known.checkAndMarkKnown).toHaveBeenCalledWith('u1', T(30));
      expect(warn.mock.calls).toEqual([['known check failed user=u1']]);
    });

    it('sweep 도 정리한 사람으로 센다 — 수집 실패로 보지 않는다', async () => {
      known.checkAndMarkKnown.mockRejectedValue(new Error('letter llm down'));
      const llm = new MockLlmProvider({ respond: addReply });
      expect(await service(llm).sweep(new Date(T(2).getTime() + 11 * 60_000))).toBe(1);
      expect(db.wikiClaims).toHaveLength(1);
      expect(warn.mock.calls).toEqual([['known check failed user=u1']]);
    });
  });

  describe('동의 없이는 LLM 으로 보내지 않는다 (CLAUDE.md 10.2c)', () => {
    const blocked: [string, FakeUserInput][] = [
      ['동의가 없다', { id: 'u2', consents: [] }],
      [
        '민감정보 동의를 철회했다',
        {
          id: 'u2',
          consents: [
            { consentType: 'sensitive_info', agreed: true, agreedAt: T(-60) },
            { consentType: 'sensitive_info', agreed: false, agreedAt: T(-30) },
            { consentType: 'cross_border_transfer', agreed: true, agreedAt: T(-60) },
          ],
        },
      ],
      ['국외이전 동의가 없다', { id: 'u2', consents: [{ consentType: 'sensitive_info', agreed: true }] }],
      ['정지됐다', { id: 'u2', status: 'suspended' }],
      ['탈퇴했다', { id: 'u2', status: 'withdrawn' }],
      ['본인인증을 하지 않았다', { id: 'u2', identityVerified: false }],
    ];

    it.each(blocked)('%s — 건너뛴다: 묶음을 차지하지도 LLM 으로 보내지도 않는다', async (_why, user) => {
      await addChat(db, user);
      const llm = new MockLlmProvider({ respond: () => EMPTY });
      await expect(service(llm).runForUser('u2', T(30))).resolves.toBeUndefined();
      expect(llm.calls).toHaveLength(0);
      expect(db.galpiStates.find((s) => s.userId === 'u2')).toMatchObject({ lastIngestAt: null, turnsSinceIngest: 2 });
      expect(db.wikiClaims).toEqual([]);
      expect(known.checkAndMarkKnown).not.toHaveBeenCalled();
      expect(debug.mock.calls).toEqual([['ingest skipped user=u2']]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('동의 확인이 오류로 실패해도 LLM 으로 보내지 않는다 — 건너뛰고 사용자 ID 만 경고한다', async () => {
      db.user.findUnique = () => Promise.reject(new Error('db down: 지은'));
      const llm = new MockLlmProvider({ respond: addReply });
      await expect(service(llm).runForUser('u1', T(30))).resolves.toBeUndefined();
      expect(llm.calls).toHaveLength(0);
      expect(db.galpiStates[0].lastIngestAt).toBeNull();
      expect(warn.mock.calls).toEqual([['ingest access check failed user=u1']]);
    });

    it('sweep 도 건너뛰고, 정리한 사람 수에 넣지 않는다', async () => {
      await addChat(db, { id: 'u2', consents: [] });
      const llm = new MockLlmProvider({ respond: addReply });
      // u1 은 정리하고 u2 는 건너뛴다
      expect(await service(llm).sweep(new Date(T(2).getTime() + 11 * 60_000))).toBe(1);
      expect(llm.calls.map((c) => c.userId)).toEqual(['u1']);
      expect(db.galpiStates.find((s) => s.userId === 'u2')?.lastIngestAt).toBeNull();
      expect(db.wikiClaims).toHaveLength(1);
      // 이제 정리할 사람은 u2 뿐 — 동의가 돌아오지 않았으니 다시 훑어도 건너뛰고 0
      expect(await service(llm).sweep(new Date(T(2).getTime() + 30 * 60_000))).toBe(0);
      expect(llm.calls).toHaveLength(1);
      expect(db.galpiStates.find((s) => s.userId === 'u2')?.lastIngestAt).toBeNull();
    });

    it('동의가 돌아오면 쌓아 둔 말을 그때 정리한다', async () => {
      await addChat(db, { id: 'u2', consents: [] });
      const llm = new MockLlmProvider({ respond: () => EMPTY });
      await service(llm).runForUser('u2', T(30));
      expect(llm.calls).toHaveLength(0);
      db.users.find((u) => u.id === 'u2')!.consents = [
        { consentType: 'sensitive_info', agreed: true, agreedAt: T(40) },
        { consentType: 'cross_border_transfer', agreed: true, agreedAt: T(40) },
      ];
      await service(llm).runForUser('u2', T(45));
      expect(llm.calls).toHaveLength(1);
      expect(db.galpiStates.find((s) => s.userId === 'u2')?.lastIngestAt).toEqual(T(1));
    });
  });

  it('로그에는 사용자 ID 와 개수만 남긴다 — 말 본문·이름·오류 내용은 남기지 않는다', async () => {
    await service(new MockLlmProvider({ responses: [addReply()] })).runForUser('u1', T(30));
    expect(log.mock.calls).toEqual([['ingest user=u1 add=1 update=0 remove=0 facts=1']]);

    // 실패 — LLM 오류가 사용자 말을 담고 있어도 로그에는 나오지 않는다
    await addChat(db, { id: 'u2', displayName: '수지' });
    const leaky = { complete: () => Promise.reject(new Error('오류: 저는 수지이고 퇴근하고 걸어요')) };
    await expect(service(leaky).runForUser('u2', T(31))).rejects.toThrow();
    expect(warn.mock.calls).toEqual([['ingest failed user=u2 error=Error']]);

    const everything = JSON.stringify([log.mock.calls, warn.mock.calls, debug.mock.calls]);
    for (const secret of ['걸어요', '지은', '수지', '퇴근', '010']) expect(everything).not.toContain(secret);
  });

  it('sweep 은 대화가 멈춘 사람만 정리한다', async () => {
    const llm = new MockLlmProvider({ respond: () => JSON.stringify({ claims: [], facts: [] }) });
    // 멈춘 지 5분 — 아직
    expect(await service(llm).sweep(new Date(T(2).getTime() + 5 * 60_000))).toBe(0);
    // 멈춘 지 11분 — 정리
    expect(await service(llm).sweep(new Date(T(2).getTime() + 11 * 60_000))).toBe(1);
    // 정리할 새 말이 없다
    expect(await service(llm).sweep(new Date(T(2).getTime() + 30 * 60_000))).toBe(0);
  });

  it('sweep 은 새 말이 없는 사람은 동의 확인도 하지 않고 지나간다', async () => {
    const llm = new MockLlmProvider({ respond: () => EMPTY });
    expect(await service(llm).sweep(new Date(T(2).getTime() + 11 * 60_000))).toBe(1);
    const lookups = vi.spyOn(db.user, 'findUnique');
    expect(await service(llm).sweep(new Date(T(2).getTime() + 30 * 60_000))).toBe(0);
    expect(lookups).not.toHaveBeenCalled();
  });

  it('알게 된 사람은 하루 한 번까지 (한국 날짜 기준)', async () => {
    const llm = new MockLlmProvider({ respond: () => JSON.stringify({ claims: [], facts: [] }) });
    db.galpiStates[0].knownAt = T(0);
    db.galpiStates[0].lastIngestAt = T(0); // 오늘 이미 정리했다
    expect(await service(llm).sweep(new Date(T(2).getTime() + 20 * 60_000))).toBe(0);
    // 한국 날짜가 바뀌면 다시 정리한다 (UTC 15시 = 한국 자정)
    expect(await service(llm).sweep(new Date('2026-10-11T15:10:00Z'))).toBe(1);
  });

  it('sweep 은 한 사람이 실패해도 다음 사람을 정리하고, 실패한 사람은 세지 않는다', async () => {
    await addChat(db, { id: 'u2' });
    const llm: LlmProvider = {
      complete: (request: LlmCompletionRequest) => (request.userId === 'u1' ? Promise.reject(new Error('llm down')) : Promise.resolve(result(EMPTY))),
    };
    const now = new Date(T(2).getTime() + 11 * 60_000);
    expect(await service(llm).sweep(now)).toBe(1);
    // 실패한 u1 은 차지를 돌려놓아 다음에 다시 정리하고, u2 는 정리를 마쳤다
    expect(db.galpiStates.find((s) => s.userId === 'u1')?.lastIngestAt).toBeNull();
    expect(db.galpiStates.find((s) => s.userId === 'u2')?.lastIngestAt).toEqual(T(1));
    expect(known.checkAndMarkKnown.mock.calls).toEqual([['u2', now]]);
    expect(warn.mock.calls).toEqual([['ingest failed user=u1 error=Error'], ['sweep ingest failed user=u1']]);
  });
});
