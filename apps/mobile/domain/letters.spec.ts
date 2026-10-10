import { describe, expect, it } from 'vitest';
import { profile } from './fixtures';
import {
  acceptLetter,
  applyExpiry,
  canReceiveNextLetter,
  chooseCandidate,
  createLetter,
  expiryLabel,
  isAwaitingMyAnswer,
  isExpired,
  passLetter,
  revealedProfile,
} from './letters';
import type { Letter } from './types';

const sentAt = new Date(2026, 9, 10, 10, 0); // 토요일
const two = () =>
  createLetter({
    id: 'L1',
    sentAt,
    candidates: [
      { id: 'a', storyLine: '주말마다 동네 빵집을 하나씩 찾아다니는 분' },
      { id: 'b', storyLine: '퇴근 후 클라이밍을 하고, 듣는 게 편한 분' },
    ],
    profiles: { a: profile('민준'), b: profile('도윤') },
  });
const one = () =>
  createLetter({
    id: 'L2',
    sentAt,
    candidates: [{ id: 'a', storyLine: '주말마다 동네 빵집을 하나씩 찾아다니는 분' }],
    profiles: { a: profile('민준') },
  });

describe('편지 만들기', () => {
  it('후보가 둘이면 고르는 단계에서 시작한다', () => {
    const l = two();
    expect(l.status).toBe('choosing');
    expect(l.chosenCandidateId).toBeNull();
  });

  it('후보가 하나면 기다리지 않고 바로 열린다', () => {
    const l = one();
    expect(l.status).toBe('open');
    expect(l.chosenCandidateId).toBe('a');
  });

  it('후보는 1~2명만', () => {
    expect(() => createLetter({ id: 'x', sentAt, candidates: [], profiles: {} })).toThrow();
    expect(() =>
      createLetter({
        id: 'x',
        sentAt,
        candidates: [
          { id: 'a', storyLine: '' },
          { id: 'b', storyLine: '' },
          { id: 'c', storyLine: '' },
        ],
        profiles: {},
      }),
    ).toThrow();
  });

  it('만료는 보낸 때로부터 정확히 7일', () => {
    expect(new Date(one().expiresAt).getTime() - sentAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('만료', () => {
  it('기한 1ms 전에는 열려 있고, 기한 그 순간부터 만료다', () => {
    const l = one();
    const exp = new Date(l.expiresAt).getTime();
    expect(isExpired(l, new Date(exp - 1))).toBe(false);
    expect(isExpired(l, new Date(exp))).toBe(true);
  });

  it('기한 표기는 날짜와 요일', () => {
    expect(expiryLabel(one())).toBe('10월 17일 토요일까지 열려 있어요');
  });

  it('만료되면 답을 기다리는 편지가 아니고, 닫힌다', () => {
    const l = one();
    const at = new Date(l.expiresAt);
    expect(isAwaitingMyAnswer(l, at)).toBe(false);
    expect(applyExpiry([l], at)[0].status).toBe('expired');
  });

  it('상대 답을 기다리던 편지도 기한이 지나면 조용히 닫힌다', () => {
    const l = acceptLetter(one());
    expect(applyExpiry([l], new Date(l.expiresAt))[0].status).toBe('expired');
  });

  it('이미 답한 편지는 만료 처리로 바뀌지 않는다', () => {
    const l = passLetter(one());
    expect(applyExpiry([l], new Date(l.expiresAt))[0].status).toBe('passed');
  });
});

describe('고르지 않은 후보는 열리지 않는다', () => {
  it('고르기 전에는 아무도 열리지 않는다', () => {
    expect(revealedProfile(two())).toBeNull();
  });

  it('고른 쪽만 열린다', () => {
    expect(revealedProfile(chooseCandidate(two(), 'b'))?.name).toBe('도윤');
  });

  it('수락 뒤에도 고른 쪽만', () => {
    expect(revealedProfile(acceptLetter(chooseCandidate(two(), 'b')))?.name).toBe('도윤');
  });

  it('연결된 뒤에도 고른 쪽만', () => {
    const l: Letter = { ...chooseCandidate(two(), 'b'), status: 'connected' };
    expect(revealedProfile(l)?.name).toBe('도윤');
  });

  it('넘기거나 만료되면 사진까지 닫힌다', () => {
    const chosen = chooseCandidate(two(), 'a');
    expect(revealedProfile(passLetter(chosen))).toBeNull();
    expect(revealedProfile(applyExpiry([chosen], new Date(chosen.expiresAt))[0])).toBeNull();
  });

  it('편지에 없는 후보는 고를 수 없다', () => {
    expect(() => chooseCandidate(two(), 'z')).toThrow();
  });

  it('이미 고른 편지는 다시 고를 수 없다', () => {
    const chosen = chooseCandidate(two(), 'a');
    expect(chooseCandidate(chosen, 'b')).toBe(chosen);
  });
});

describe('넘기기', () => {
  it('넘긴 이유는 다듬어 서고에만 남긴다', () => {
    expect(passLetter(one(), '  분위기가 달라요 ').passReason).toBe('분위기가 달라요');
  });

  it('빈 이유는 남기지 않는다', () => {
    expect(passLetter(one(), '   ')).not.toHaveProperty('passReason');
  });

  it('고르는 중에도 둘 다 넘길 수 있다', () => {
    expect(passLetter(two()).status).toBe('passed');
  });

  it('이미 수락한 편지는 넘길 수 없다', () => {
    const accepted = acceptLetter(one());
    expect(passLetter(accepted)).toBe(accepted);
  });
});

describe('한 번에 한 통', () => {
  const now = new Date(2026, 9, 11, 9, 0);

  it('답하지 않은 편지가 있으면 다음 편지를 받지 않는다', () => {
    expect(canReceiveNextLetter([one()], now, false)).toBe(false);
  });

  it('넘기면 잠금이 풀린다', () => {
    expect(canReceiveNextLetter([passLetter(one())], now, false)).toBe(true);
  });

  it('수락하면 상대 답을 기다리는 동안에도 잠금이 풀린다', () => {
    expect(canReceiveNextLetter([acceptLetter(one())], now, false)).toBe(true);
  });

  it('만료되면 잠금이 풀린다', () => {
    const l = one();
    expect(canReceiveNextLetter([l], new Date(l.expiresAt), false)).toBe(true);
  });

  it('편지 잠시 쉬기 중에는 받지 않는다', () => {
    expect(canReceiveNextLetter([], now, true)).toBe(false);
  });
});
