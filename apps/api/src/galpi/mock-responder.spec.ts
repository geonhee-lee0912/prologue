import { Logger } from '@nestjs/common';
import { MockLlmProvider, type WikiPageKey } from '@prologue/shared';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { GalpiAccessService } from './access.service';
import { ConversationService } from './conversation.service';
import { KnownService } from './known.service';
import { galpiMockRespond } from './mock-responder';
import { buildReplyMessages } from './prompt/reply-prompt';
import { QuickReplyService } from './quick-reply.service';
import { parseReply } from './reply';
import { ReportService } from './report/report.service';
import { FakePrisma } from './testing/fake-prisma';
import { parseIngest } from './wiki/ingest';
import { buildIngestMessages } from './wiki/ingest.prompt';
import { IngestService } from './wiki/ingest.service';
import { WikiService } from './wiki/wiki.service';

const emptyPages = (): Record<WikiPageKey, string[]> => ({ now: [], people: [], relationship: [], met: [], attraction: [], next_topics: [] });

/** 메모리 DB 의 비동기 작업(띄워 둔 수집·알게 됨 확인)이 끝나기를 기다린다 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// 서고 수집·첫 리포트가 남기는 로그를 출력에 섞지 않는다. 경고는 엔진이 대체 문장으로 비켜 갔거나 띄워 둔 작업이 실패했다는 뜻이라 따로 본다
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

describe('로컬 mock 응답', () => {
  it('reply 는 갈피 답 형식이고, 세 번째 말부터 모르는 실용 정보를 버튼으로 묻는다', () => {
    const raw = galpiMockRespond({
      purpose: 'reply',
      messages: buildReplyMessages({
        speechLevel: 'mixed',
        known: false,
        pages: emptyPages(),
        gaps: [],
        missingPractical: ['smoking'],
        askableConditions: [],
        flags: { sensitiveJustNow: false, skipped: false },
        history: [
          { sender: 'user', text: '하나' },
          { sender: 'user', text: '둘' },
          { sender: 'user', text: '셋이에요' },
        ],
      }),
    });
    expect(parseReply(raw)).toMatchObject({ quickReply: { type: 'practical', fact: 'smoking' }, signals: { crisis: 'none' } });
  });

  it('ingest 는 이번 사용자 말을 출처로 문장을 더한다', () => {
    const raw = galpiMockRespond({
      purpose: 'ingest',
      messages: buildIngestMessages({
        claims: [],
        facts: [],
        batch: [
          { id: 'm1', sender: 'user', text: '퇴근하고 걸어요' },
          { id: 'g1', sender: 'galpi', text: '오, 좋다' },
        ],
      }),
    });
    const ops = parseIngest(raw, { batchUserMessageIds: new Set(['m1']), existingClaims: new Map(), maxClaimsPerPage: 15 });
    expect(ops.adds).toEqual([{ page: 'now', text: '퇴근하고 걸어요', sources: ['m1'] }]);
  });

  // UTF-16 칸으로 자르면 60번째 글자인 이모지의 앞 절반만 남는다 — 그런 문장은 저장이 거절돼 수집이 매번 실패한다 (text.ts)
  it('ingest 는 문장을 글자(코드 포인트)로 잘라 이모지를 반으로 가르지 않는다', () => {
    const raw = galpiMockRespond({
      purpose: 'ingest',
      messages: buildIngestMessages({ claims: [], facts: [], batch: [{ id: 'm1', sender: 'user', text: `${'가'.repeat(59)}🙂 그리고 더` }] }),
    });
    const ops = parseIngest(raw, { batchUserMessageIds: new Set(['m1']), existingClaims: new Map(), maxClaimsPerPage: 15 });
    expect(ops.adds).toEqual([{ page: 'now', text: `${'가'.repeat(59)}🙂`, sources: ['m1'] }]);
  });

  it('첫 만남 → 12턴 → 실용 정보 버튼 → 알게 됨 → 첫 리포트까지 끝까지 돈다', async () => {
    const db = new FakePrisma();
    db.addUser({ id: 'u1', displayName: '지은' });
    const prisma = db as unknown as PrismaService;
    const llm = new MockLlmProvider({ respond: galpiMockRespond });
    const access = new GalpiAccessService(prisma);
    const wiki = new WikiService(prisma);
    const reports = new ReportService(prisma, llm);
    const known = new KnownService(prisma, wiki, reports);
    const ingest = new IngestService(prisma, llm, known, access);
    const conversation = new ConversationService(prisma, llm, access, wiki, ingest);
    const quickReply = new QuickReplyService(prisma, access, known);
    let clock = Date.UTC(2026, 9, 11, 3, 0);
    const tick = () => new Date((clock += 60_000));

    await conversation.start('u1', tick());
    for (let i = 1; i <= 12; i += 1) {
      const turn = await conversation.send('u1', { text: `이야기 ${i}: 퇴근하고 걷는 게 좋아요` }, tick());
      const asked = turn.messages.find((m) => m.quickReply?.type === 'practical' && m.quickReply.answeredKey === null);
      if (asked?.quickReply) await quickReply.answer('u1', asked.id, asked.quickReply.options[0].key, tick());
      await flush();
    }

    expect(db.galpiStates[0].knownAt).not.toBeNull();
    expect(db.selfReports).toHaveLength(1);
    expect(db.profileFacts.map((f) => [f.key, f.value]).sort()).toEqual([
      ['children_intent', 'yes'],
      ['marriage_intent', 'yes'],
      ['smoking', 'no'],
    ]);
    expect((await reports.latest('u1'))?.body.startsWith('지은 님,')).toBe(true);
    // 대체 문장으로 비켜 간 턴도, 실패한 수집·알게 됨 확인도 없이 돌았다
    expect(warn).not.toHaveBeenCalled();
  });
});
