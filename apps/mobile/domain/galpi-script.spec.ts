import { POLICY } from '@prologue/shared/policy';
import { describe, expect, it } from 'vitest';
import { emptyState } from './fixtures';
import { firstMeetingMessages, INTERVIEW_QUESTIONS, replyToUser } from './galpi-script';
import type { AppState, GalpiMessage } from './types';

let n = 0;
const ctx = { now: new Date(2026, 9, 11, 9, 0), newId: () => `id-${(n += 1)}` };
const texts = (ms: GalpiMessage[]) => ms.flatMap((m) => (m.kind === 'text' ? [m.text] : []));
const interviewing = (step: number): AppState => ({ ...emptyState(), interview: { step, completed: false } });

describe('갈피 대본', () => {
  it('인터뷰 질문 수는 완주 기준과 같다', () => {
    expect(INTERVIEW_QUESTIONS).toHaveLength(POLICY.interview.minTurns);
  });

  it('첫 만남 — 자기소개, 서고 규칙, 첫 질문', () => {
    const ms = texts(firstMeetingMessages(ctx));
    expect(ms[0]).toContain('갈피예요');
    expect(ms.some((t) => t.includes('다른 사용자에게는 보여주지 않아요'))).toBe(true);
    // AI 처리·신고 시 열람·설명 요청 응대가 있으니 "누구에게도", "저만"이라고 약속하지 않는다 (CLAUDE.md 10.2c·10.2d)
    expect(ms.some((t) => t.includes('누구에게도') || t.includes('저만 읽어요'))).toBe(false);
    expect(ms[ms.length - 1]).toBe(INTERVIEW_QUESTIONS[0]);
  });

  it('답하면 받아 주고 다음 질문 하나만', () => {
    const r = replyToUser(interviewing(0), { skipped: false }, ctx);
    expect(r.interview).toEqual({ step: 1, completed: false });
    expect(texts(r.replies)).toHaveLength(2);
    expect(texts(r.replies)[1]).toBe(INTERVIEW_QUESTIONS[1]);
  });

  it('넘기면 이유를 묻지 않고 다른 이야기로', () => {
    const r = replyToUser(interviewing(2), { skipped: true }, ctx);
    expect(texts(r.replies)[0]).toBe('괜찮아요. 다른 이야기로 가 볼게요.');
    expect(texts(r.replies)[1]).toBe(INTERVIEW_QUESTIONS[3]);
  });

  it('네 번째, 여덟 번째, 마지막 답에서 책장에 장이 꽂힌다', () => {
    expect(replyToUser(interviewing(3), { skipped: false }, ctx).newChapters[0].title).toBe('첫 장 — 요즘의 나');
    expect(replyToUser(interviewing(7), { skipped: false }, ctx).newChapters[0].title).toBe(
      '두 번째 장 — 나를 둘러싼 사람들',
    );
    expect(replyToUser(interviewing(4), { skipped: false }, ctx).newChapters).toHaveLength(0);
  });

  it('마지막 답이면 완주, 뿌듯한 표정과 리포트 안내', () => {
    const r = replyToUser(interviewing(INTERVIEW_QUESTIONS.length - 1), { skipped: false }, ctx);
    expect(r.interview.completed).toBe(true);
    expect(r.replies.some((m) => m.kind === 'emoticon' && m.expression === 'proud')).toBe(true);
    expect(texts(r.replies).some((t) => t.includes('제가 읽은 당신'))).toBe(true);
    expect(r.newChapters[0].title).toBe('세 번째 장 — 내가 바라는 관계');
  });

  it('완주 뒤 매일 대화는 질문 하나로 끝맺는다', () => {
    const r = replyToUser(emptyState(), { skipped: false }, ctx);
    expect(texts(r.replies)[0].endsWith('?')).toBe(true);
    expect(r.interview).toEqual(emptyState().interview);
  });
});
