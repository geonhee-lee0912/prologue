import { Logger } from '@nestjs/common';
import { AI_LETTER_NOTICE, GALPI_COPY, MockLlmProvider } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service';
import { FakePrisma } from '../testing/fake-prisma';
import { ReportService } from './report.service';

const NOW = new Date('2026-10-11T03:00:00Z');

async function setup(responses: string[]) {
  const db = new FakePrisma();
  db.addUser({ id: 'u1', displayName: '지은' });
  await db.wikiClaim.create({ data: { userId: 'u1', page: 'now', text: '퇴근 뒤에는 혼자 걷는다' } });
  await db.wikiClaim.create({ data: { userId: 'u1', page: 'next_topics', text: '금요일에 발표가 있다' } });
  const llm = new MockLlmProvider({ responses });
  return { db, llm, reports: new ReportService(db as unknown as PrismaService, llm) };
}

describe('첫 리포트 (스펙 6장)', () => {
  // 로그가 테스트 출력에 섞이지 않게 막고, 무엇을 남겼는지 확인한다
  let log: MockInstance<Logger['log']>;

  beforeEach(() => {
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('보이는 장만 읽고 무료 리포트를 쓰고, 갈피가 대화방에 알린다', async () => {
    const { db, llm, reports } = await setup(['{name}, 들려준 이야기를 천천히 읽었어요.']);
    await reports.generateFirst('u1', NOW);

    expect(db.selfReports).toHaveLength(1);
    expect(db.selfReports[0]).toMatchObject({ userId: 'u1', paid: false, body: '{name}, 들려준 이야기를 천천히 읽었어요.' });
    expect(db.galpiMessages.map((m) => [m.kind, m.content])).toEqual([
      ['emoticon', 'proud'],
      ['text', GALPI_COPY.firstReportDelivered],
    ]);
    const prompt = llm.calls[0].messages.map((m) => m.content).join('\n');
    expect(prompt).toContain('퇴근 뒤에는 혼자 걷는다');
    // AI 만 보는 장은 리포트에 들어가지 않는다
    expect(prompt).not.toContain('금요일에 발표가 있다');
  });

  it('이미 리포트가 있으면 다시 쓰지 않는다', async () => {
    const { db, llm, reports } = await setup(['첫 편지', '둘째 편지']);
    await reports.generateFirst('u1', NOW);
    await reports.generateFirst('u1', NOW);
    expect(db.selfReports).toHaveLength(1);
    expect(llm.calls).toHaveLength(1);
  });

  it('금지 표현이 나오면 한 번 다시 쓴다', async () => {
    const { db, llm, reports } = await setup(['당신은 운명의 상대를 만날 거예요.', '들려준 이야기를 읽었어요.']);
    await reports.generateFirst('u1', NOW);
    expect(llm.calls).toHaveLength(2);
    expect(db.selfReports[0].body).toBe('들려준 이야기를 읽었어요.');
  });

  it('다시 써도 남은 금지 표현과 새어 든 민감정보는 그 문장째 뺀다, 이모지도 뺀다', async () => {
    const { db, reports } = await setup([
      '운명 같은 사람이에요. 산책을 좋아해요.',
      '운명이 느껴져요. 주말엔 교회에 가는 것 같아요. 걷는 걸 좋아해요 🙂\n둘째 문단이에요.',
    ]);
    await reports.generateFirst('u1', NOW);
    expect(db.selfReports[0].body).toBe('걷는 걸 좋아해요\n둘째 문단이에요.');
  });

  it('최근 리포트는 이름을 편지 호칭으로 바꾸고 AI 고지를 붙인다', async () => {
    const { reports } = await setup(['{name}, 들려준 이야기를 천천히 읽었어요.']);
    await reports.generateFirst('u1', NOW);
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

  it('쓸 문장이 하나도 남지 않으면 빈 리포트를 두지 않고 실패로 본다 — 알림도 가지 않는다', async () => {
    // 빈 답 (추론 토큰이 출력 한도를 먹는 경우)
    const blank = await setup(['  \n ']);
    await expect(blank.reports.generateFirst('u1', NOW)).rejects.toThrow('first report is empty');
    expect(blank.db.selfReports).toHaveLength(0);
    expect(blank.db.galpiMessages).toHaveLength(0);

    // 금지 표현뿐인 편지는 다시 써도 그대로면 문장째 다 빠진다
    const banned = await setup(['운명이에요.', '운명이에요.']);
    await expect(banned.reports.generateFirst('u1', NOW)).rejects.toThrow('first report is empty');
    expect(banned.db.selfReports).toHaveLength(0);
    expect(banned.db.galpiMessages).toHaveLength(0);
  });

  it('로그에는 사용자 ID 만 남기고 편지 본문은 쓰지 않는다 (CLAUDE.md 10.3)', async () => {
    const { reports } = await setup(['{name}, 퇴근 뒤에 혼자 걷는 사람이에요.']);
    await reports.generateFirst('u1', NOW);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('first report written user=u1');
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain('걷는');
    expect(logged).not.toContain('지은');
  });
});
