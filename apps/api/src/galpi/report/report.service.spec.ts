import { AI_LETTER_NOTICE, GALPI_COPY, MockLlmProvider } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { FakePrisma } from '../testing/fake-prisma';
import { ReportService, type ReportTx } from './report.service';

const NOW = new Date('2026-10-11T03:00:00Z');

async function setup(responses: string[]) {
  const db = new FakePrisma();
  db.addUser({ id: 'u1', displayName: '지은' });
  await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '퇴근 뒤에는 혼자 걷는다' } });
  await db.wikiClaim.create({ data: { userId: 'u1', page: 'next_topics', text: '금요일에 발표가 있다' } });
  const llm = new MockLlmProvider({ responses });
  return { db, llm, reports: new ReportService(db as unknown as PrismaService, llm) };
}

const asTx = (fake: FakePrisma) => fake as unknown as ReportTx;

/** KnownService 가 하는 대로 — 편지를 쓰고, 리포트와 알림을 넣는다 (db 자체가 트랜잭션 클라이언트 구실을 한다) */
async function firstReport(db: FakePrisma, reports: ReportService): Promise<void> {
  await reports.saveFirst(asTx(db), 'u1', await reports.writeFirstLetter('u1'), NOW);
}

describe('첫 리포트 (스펙 6장)', () => {
  it('보이는 장만 읽고 편지를 쓴다 — 쓰는 동안 DB 에는 아무것도 적지 않는다', async () => {
    const { db, llm, reports } = await setup(['{name}, 들려준 이야기를 천천히 읽었어요.']);
    const letter = await reports.writeFirstLetter('u1');

    expect(letter).toBe('{name}, 들려준 이야기를 천천히 읽었어요.');
    expect(db.selfReports).toHaveLength(0);
    expect(db.galpiMessages).toHaveLength(0);
    expect(llm.calls[0]).toMatchObject({ purpose: 'report', userId: 'u1' });
    const prompt = llm.calls[0].messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('퇴근 뒤에는 혼자 걷는다');
    // AI 만 보는 장은 리포트에 들어가지 않는다
    expect(prompt).not.toContain('금요일에 발표가 있다');
  });

  it('무료 리포트와 갈피의 알림을 넘겨 받은 트랜잭션 클라이언트로만 넣는다 — 알림은 같은 시각의 버튼 답 안내(now+1)보다 뒤에 놓인다', async () => {
    const { db, reports } = await setup([]);
    const tx = new FakePrisma();
    await reports.saveFirst(asTx(tx), 'u1', '{name}, 들려준 이야기를 천천히 읽었어요.', NOW);

    expect(tx.selfReports).toHaveLength(1);
    expect(tx.selfReports[0]).toMatchObject({ userId: 'u1', paid: false, body: '{name}, 들려준 이야기를 천천히 읽었어요.', createdAt: NOW });
    expect(tx.galpiMessages.map((m) => [m.sender, m.kind, m.content])).toEqual([
      ['galpi', 'emoticon', 'proud'],
      ['galpi', 'text', GALPI_COPY.firstReportDelivered],
    ]);
    // 이모티콘 now+2, 안내 now+3 — 같은 now 로 부르는 버튼 답이 갈피의 답을 now+1 에 놓는다
    const at = (ms: number) => new Date(NOW.getTime() + ms);
    expect(tx.galpiMessages.map((m) => m.createdAt)).toEqual([at(2), at(3)]);
    // 트랜잭션 밖(바깥 클라이언트)에는 아무것도 쓰지 않는다
    expect(db.selfReports).toHaveLength(0);
    expect(db.galpiMessages).toHaveLength(0);
  });

  it('금지 표현이 나오면 한 번 다시 쓴다', async () => {
    const { llm, reports } = await setup(['당신은 운명의 상대를 만날 거예요.', '들려준 이야기를 읽었어요.']);
    expect(await reports.writeFirstLetter('u1')).toBe('들려준 이야기를 읽었어요.');
    expect(llm.calls).toHaveLength(2);
  });

  it('다시 써도 남은 금지 표현과 새어 든 민감정보는 그 문장째 뺀다, 이모지도 뺀다', async () => {
    const { reports } = await setup([
      '운명 같은 사람이에요. 산책을 좋아해요.',
      '운명이 느껴져요. 주말엔 교회에 가는 것 같아요. 걷는 걸 좋아해요 🙂\n둘째 문단이에요.',
    ]);
    expect(await reports.writeFirstLetter('u1')).toBe('걷는 걸 좋아해요\n둘째 문단이에요.');
  });

  it('편지에 연락처가 새어 들면 저장하기 전에 지운다 (CLAUDE.md 10.1)', async () => {
    const { reports } = await setup(['{name}, 연락은 010-1234-5678 로 자주 해요. 걷는 걸 좋아해요.']);
    const letter = await reports.writeFirstLetter('u1');
    expect(letter).not.toContain('010-1234-5678');
    expect(letter).toBe('{name}, 연락은 [연락처] 로 자주 해요. 걷는 걸 좋아해요.');
  });

  it('최근 리포트는 이름을 편지 호칭으로 바꾸고 AI 고지를 붙인다', async () => {
    const { db, reports } = await setup(['{name}, 들려준 이야기를 천천히 읽었어요.']);
    await firstReport(db, reports);
    expect(await reports.latest('u1')).toMatchObject({
      body: '지은 님, 들려준 이야기를 천천히 읽었어요.',
      aiNotice: AI_LETTER_NOTICE,
      createdAt: NOW.toISOString(),
    });
  });

  it('리포트가 없으면 null', async () => {
    const { reports } = await setup([]);
    expect(await reports.latest('u1')).toBeNull();
  });

  it('쓸 문장이 하나도 남지 않으면 던진다 — 호칭만 남은 편지도 빈 편지다', async () => {
    const cases: Record<string, string[]> = {
      // 빈 답 (추론 토큰이 출력 한도를 먹는 경우)
      '빈 답': ['  \n '],
      // 금지 표현뿐인 편지는 다시 써도 그대로면 문장째 다 빠진다
      '금지 표현뿐': ['운명이에요.', '운명이에요.'],
      // 호칭 줄만 남는 편지 — "{name}," 은 남지만 편지가 아니다
      '호칭 줄만 남음': ['{name},\n운명이에요.', '{name},\n운명이에요.'],
      '호칭뿐': ['{name},'],
    };
    for (const [name, responses] of Object.entries(cases)) {
      const { db, reports } = await setup(responses);
      await expect(reports.writeFirstLetter('u1'), name).rejects.toThrow('first report is empty');
      expect(db.selfReports, name).toHaveLength(0);
      expect(db.galpiMessages, name).toHaveLength(0);
    }
  });

  it('이름이 없는 사용자의 편지는 앞 빈 줄 없이 시작하고, 이름이 있으면 문단 나눔까지 그대로다', async () => {
    const { db, reports } = await setup([]);
    db.addUser({ id: 'u2', displayName: null });
    const body = '{name},\n\n들려준 이야기를 읽었어요.';
    for (const userId of ['u1', 'u2']) await db.selfReport.create({ data: { userId, body, paid: false, createdAt: NOW } });

    expect((await reports.latest('u2'))?.body).toBe('들려준 이야기를 읽었어요.');
    expect((await reports.latest('u1'))?.body).toBe('지은 님,\n\n들려준 이야기를 읽었어요.');
  });
});
