import { HttpStatus } from '@nestjs/common';
import { ErrorCode, type GalpiMemoryDto, type GalpiReportDto, type GalpiTurnResultDto } from '@prologue/shared';
import { describe, expect, it, vi } from 'vitest';
import type { CurrentUserData } from '../auth/types/jwt-payload';
import { AppException } from '../common/exceptions/app.exception';
import type { GalpiAccessService } from './access.service';
import type { ConversationService } from './conversation.service';
import { GalpiController } from './galpi.controller';
import type { QuickReplyService } from './quick-reply.service';
import type { ReportService } from './report/report.service';
import type { WikiService } from './wiki/wiki.service';

/*
 * 라우트마다 어떤 출입 확인을 쓰는지 고정한다 — 권한을 바꾸는 변경은 회귀 테스트가 있어야 한다 (CLAUDE.md 14장)
 * - 열람·빼기·리포트: 컨트롤러가 본인인증(assertVerified)만 먼저 본다. 동의를 철회해도 열람·삭제권은 남는다 (CLAUDE.md 10.2b·10.2c)
 * - 대화(첫 만남·말하기·버튼 답)와 대화 기록: 서비스가 스스로 확인한다(각 서비스 spec) — 컨트롤러는 본인 id 와 받은 값만 넘긴다
 * vitest(esbuild)는 데코레이터 메타데이터를 만들지 않으므로 Nest DI 없이 대역 서비스로 직접 만든다
 */

const ME: CurrentUserData = { userId: 'u1', role: 'authenticated' };

const TURN: GalpiTurnResultDto = { messages: [{ id: 'g1', from: 'galpi', kind: 'text', text: '갈피의 말', at: '2026-10-12T10:00:00.000Z' }] };
const MEMORIES: GalpiMemoryDto[] = [{ id: 'claim-1', page: 'now', pageTitle: '요즘', text: '서고의 문장' }];
const REPORT: GalpiReportDto = { id: 'r1', body: '리포트 본문', aiNotice: 'AI 고지', createdAt: '2026-10-12T10:00:00.000Z' };

/** 대역 서비스로 컨트롤러를 만든다. calls 에 대역이 불린 순서가 남는다 */
function setup({ verified = true, consented = true }: { verified?: boolean; consented?: boolean } = {}) {
  const calls: string[] = [];
  const errors = {
    unverified: new AppException(ErrorCode.IDENTITY_VERIFICATION_REQUIRED, '본인인증을 먼저 해 주세요.', HttpStatus.FORBIDDEN),
    consentRequired: new AppException(ErrorCode.AI_CONSENT_REQUIRED, '갈피와 이야기하려면 동의가 필요해요.', HttpStatus.FORBIDDEN),
    notFound: new AppException(ErrorCode.NOT_FOUND, '찾을 수 없어요.', HttpStatus.NOT_FOUND),
  };
  // GalpiAccessService 와 같은 판정 — 본인인증을 먼저 보고, 대화는 동의까지 본다
  const access = {
    assertVerified: vi.fn(async (_userId: string): Promise<void> => {
      calls.push('access.assertVerified');
      if (!verified) throw errors.unverified;
    }),
    assertCanTalk: vi.fn(async (_userId: string): Promise<void> => {
      calls.push('access.assertCanTalk');
      if (!verified) throw errors.unverified;
      if (!consented) throw errors.consentRequired;
    }),
  };
  const wiki = {
    listVisible: vi.fn(async (_userId: string): Promise<GalpiMemoryDto[]> => {
      calls.push('wiki.listVisible');
      return MEMORIES;
    }),
    removeClaim: vi.fn(async (_userId: string, _claimId: string): Promise<void> => {
      calls.push('wiki.removeClaim');
    }),
  };
  const report = {
    latest: vi.fn(async (_userId: string): Promise<GalpiReportDto | null> => {
      calls.push('report.latest');
      return REPORT;
    }),
  };
  const conversation = {
    start: vi.fn(async (_userId: string): Promise<GalpiTurnResultDto> => {
      calls.push('conversation.start');
      return TURN;
    }),
    history: vi.fn(async (_userId: string, _opts: { before?: string; limit?: number }): Promise<GalpiTurnResultDto> => {
      calls.push('conversation.history');
      return TURN;
    }),
    send: vi.fn(async (_userId: string, _input: { text: string; skipped?: boolean }): Promise<GalpiTurnResultDto> => {
      calls.push('conversation.send');
      return TURN;
    }),
  };
  const quickReply = {
    answer: vi.fn(async (_userId: string, _messageId: string, _key: string): Promise<GalpiTurnResultDto> => {
      calls.push('quickReply.answer');
      return TURN;
    }),
  };
  const controller = new GalpiController(
    conversation as unknown as ConversationService,
    quickReply as unknown as QuickReplyService,
    access as unknown as GalpiAccessService,
    wiki as unknown as WikiService,
    report as unknown as ReportService,
  );
  return { controller, calls, errors, access, wiki, report, conversation, quickReply };
}

/** 컨트롤러가 본인인증만 먼저 보는 라우트 — 열람·빼기·리포트 */
const VIEW_ROUTES: { route: string; service: string; call: (c: GalpiController) => Promise<unknown> }[] = [
  { route: 'GET /v1/galpi/memories', service: 'wiki.listVisible', call: (c) => c.memories(ME) },
  { route: 'DELETE /v1/galpi/memories/:id', service: 'wiki.removeClaim', call: (c) => c.removeMemory(ME, 'claim-1') },
  { route: 'GET /v1/galpi/report', service: 'report.latest', call: (c) => c.latestReport(ME) },
];

describe('갈피 컨트롤러 — 열람·빼기·리포트는 본인인증만 본다', () => {
  it.each(VIEW_ROUTES)('$route: 본인인증을 확인한 다음에 서비스를 부른다', async ({ service, call }) => {
    const { controller, calls, access } = setup();
    await call(controller);
    expect(calls).toEqual(['access.assertVerified', service]);
    expect(access.assertVerified).toHaveBeenCalledWith('u1');
  });

  it.each(VIEW_ROUTES)('$route: 본인인증이 안 됐으면 서비스를 부르지 않고 그 예외를 그대로 낸다', async ({ call }) => {
    const { controller, calls, errors } = setup({ verified: false });
    await expect(call(controller)).rejects.toBe(errors.unverified);
    expect(calls).toEqual(['access.assertVerified']);
  });

  it.each(VIEW_ROUTES)('$route: 동의를 철회해도 된다 — 대화 출입 확인(assertCanTalk)은 부르지 않는다', async ({ service, call }) => {
    const { controller, calls, access } = setup({ consented: false });
    await call(controller);
    expect(access.assertCanTalk).not.toHaveBeenCalled();
    expect(calls).toEqual(['access.assertVerified', service]);
  });

  it('서고 목록은 본인 것을 읽어 받은 그대로 돌려준다', async () => {
    const { controller, wiki } = setup();
    await expect(controller.memories(ME)).resolves.toBe(MEMORIES);
    expect(wiki.listVisible).toHaveBeenCalledWith('u1');
  });

  it('갈피 빼기는 본인 id 와 경로의 id 를 넘기고 본문 없이 끝난다', async () => {
    const { controller, wiki } = setup();
    await expect(controller.removeMemory(ME, 'claim-1')).resolves.toBeUndefined();
    expect(wiki.removeClaim).toHaveBeenCalledWith('u1', 'claim-1');
  });

  it('갈피 빼기가 실패하면(없는 문장 등) 지운 것처럼 끝내지 않고 그 예외를 그대로 낸다', async () => {
    const { controller, wiki, errors } = setup();
    wiki.removeClaim.mockRejectedValueOnce(errors.notFound);
    await expect(controller.removeMemory(ME, 'claim-404')).rejects.toBe(errors.notFound);
  });

  it('리포트는 본인의 최근 것을 받은 그대로, 없으면 null 을 돌려준다', async () => {
    const { controller, report } = setup();
    await expect(controller.latestReport(ME)).resolves.toBe(REPORT);
    expect(report.latest).toHaveBeenCalledWith('u1');
    report.latest.mockResolvedValueOnce(null);
    await expect(controller.latestReport(ME)).resolves.toBeNull();
  });
});

describe('갈피 컨트롤러 — 대화와 대화 기록은 서비스가 출입을 확인한다', () => {
  it('첫 만남은 본인 id 로 부르고 받은 그대로 돌려준다', async () => {
    const { controller, conversation } = setup();
    await expect(controller.start(ME)).resolves.toBe(TURN);
    expect(conversation.start).toHaveBeenCalledWith('u1');
  });

  it('대화 기록은 before·limit 을 그대로 넘기고, 동의를 철회했다고 컨트롤러가 막지 않는다', async () => {
    const { controller, conversation, access } = setup({ consented: false });
    await expect(controller.history(ME, { before: 'g-40', limit: 20 })).resolves.toBe(TURN);
    expect(conversation.history).toHaveBeenCalledWith('u1', { before: 'g-40', limit: 20 });
    await controller.history(ME, {});
    expect(conversation.history).toHaveBeenLastCalledWith('u1', { before: undefined, limit: undefined });
    expect(access.assertCanTalk).not.toHaveBeenCalled();
  });

  it('말하기는 text·skipped 를 넘긴다 — "다른 얘기 할래요"는 빈 문자열과 skipped', async () => {
    const { controller, conversation } = setup();
    await expect(controller.send(ME, { text: '안녕' })).resolves.toBe(TURN);
    expect(conversation.send).toHaveBeenCalledWith('u1', { text: '안녕', skipped: undefined });
    await controller.send(ME, { text: '', skipped: true });
    expect(conversation.send).toHaveBeenLastCalledWith('u1', { text: '', skipped: true });
  });

  it('버튼 답은 본인 id, 경로의 메시지 id, 고른 key 를 넘긴다', async () => {
    const { controller, quickReply } = setup();
    await expect(controller.answer(ME, 'g-7', { key: 'allow' })).resolves.toBe(TURN);
    expect(quickReply.answer).toHaveBeenCalledWith('u1', 'g-7', 'allow');
  });

  it('서비스가 거절하면 그 예외를 바꾸지 않고 그대로 낸다 — 대화는 동의 없음, 기록은 본인인증 안 됨', async () => {
    const { controller, conversation, quickReply, errors } = setup();
    conversation.start.mockRejectedValueOnce(errors.consentRequired);
    conversation.send.mockRejectedValueOnce(errors.consentRequired);
    quickReply.answer.mockRejectedValueOnce(errors.consentRequired);
    conversation.history.mockRejectedValueOnce(errors.unverified);
    await expect(controller.start(ME)).rejects.toBe(errors.consentRequired);
    await expect(controller.send(ME, { text: '안녕' })).rejects.toBe(errors.consentRequired);
    await expect(controller.answer(ME, 'g-7', { key: 'allow' })).rejects.toBe(errors.consentRequired);
    await expect(controller.history(ME, {})).rejects.toBe(errors.unverified);
  });
});
