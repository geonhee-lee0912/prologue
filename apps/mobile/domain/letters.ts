/**
 * 편지 규칙 — 앱 IA 4.1(두 종류의 소개 중 메인), 5장(편지는 관계를 따라간다)
 *
 * - 후보가 둘이면 이야기 한 줄로 하나를 고른다. 고른 쪽만 열린다
 * - 한 번에 한 통. 지금 편지에 답하기 전엔 다음 편지가 오지 않는다
 * - 7일 뒤 만료. 넘기거나 만료되면 사진까지 닫힌다
 */
import { POLICY } from '@prologue/shared/policy';
import { addDays, untilLabel } from './time';
import type { Letter, LetterProfile, LetterStatus, StoryCandidate } from './types';

const AWAITING: readonly LetterStatus[] = ['choosing', 'open'];

export function createLetter(args: {
  id: string;
  candidates: StoryCandidate[];
  profiles: Record<string, LetterProfile>;
  sentAt: Date;
}): Letter {
  const { id, candidates, profiles, sentAt } = args;
  const max = POLICY.introduction.maxStoryChoices;
  if (candidates.length < 1 || candidates.length > max) {
    throw new Error(`편지 후보는 1~${max}명이어야 한다`);
  }
  const single = candidates.length === 1;
  return {
    id,
    candidates,
    profiles,
    chosenCandidateId: single ? candidates[0].id : null,
    status: single ? 'open' : 'choosing',
    sentAt: sentAt.toISOString(),
    expiresAt: addDays(sentAt, POLICY.introduction.letterExpiryDays).toISOString(),
  };
}

export function isExpired(letter: Letter, now: Date): boolean {
  return now.getTime() >= new Date(letter.expiresAt).getTime();
}

/** 내 답을 기다리는 편지인가 (고르는 중이거나 열렸고, 아직 기한 안) */
export function isAwaitingMyAnswer(letter: Letter, now: Date): boolean {
  return AWAITING.includes(letter.status) && !isExpired(letter, now);
}

/** 닫힌 편지인가 — 넘김·만료는 닫히고, 답을 기다리는 편지는 기한이 지나면 조용히 닫힌다. 연결된 편지는 시간으로 닫히지 않는다 (앱 IA 5장) */
export function isLetterClosed(letter: Letter, now: Date): boolean {
  switch (letter.status) {
    case 'passed':
    case 'expired':
      return true;
    case 'choosing':
    case 'open':
    case 'acceptedWaiting':
      return isExpired(letter, now);
    case 'connected':
      return false;
  }
}

/** "10월 17일 토요일까지 열려 있어요" — 사실만 말하고 재촉하지 않는다 (CLAUDE.md 9.1) */
export function expiryLabel(letter: Letter): string {
  return `${untilLabel(new Date(letter.expiresAt))} 열려 있어요`;
}

export function chooseCandidate(letter: Letter, candidateId: string): Letter {
  if (letter.status !== 'choosing') return letter;
  if (!letter.candidates.some((c) => c.id === candidateId)) {
    throw new Error('편지에 없는 후보다');
  }
  return { ...letter, chosenCandidateId: candidateId, status: 'open' };
}

/** 고른 후보의 편지만 열린다. 고르지 않은 쪽은 어떤 상태에서도 열리지 않는다 */
export function revealedProfile(letter: Letter): LetterProfile | null {
  if (letter.status === 'choosing' || letter.status === 'passed' || letter.status === 'expired') {
    return null;
  }
  if (!letter.chosenCandidateId) return null;
  return letter.profiles[letter.chosenCandidateId] ?? null;
}

export function acceptLetter(letter: Letter): Letter {
  if (letter.status !== 'open') return letter;
  return { ...letter, status: 'acceptedWaiting' };
}

export function passLetter(letter: Letter, reason?: string): Letter {
  if (!AWAITING.includes(letter.status)) return letter;
  const trimmed = reason?.trim();
  return { ...letter, status: 'passed', ...(trimmed ? { passReason: trimmed } : {}) };
}

/** 답 없이 기한이 지난 편지와, 상대 답을 기다리다 기한이 지난 편지를 닫는다 */
export function applyExpiry(letters: Letter[], now: Date): Letter[] {
  return letters.map((l) =>
    (AWAITING.includes(l.status) || l.status === 'acceptedWaiting') && isExpired(l, now)
      ? { ...l, status: 'expired' as const }
      : l,
  );
}

/** 한 번에 한 통 — 답하지 않은 편지가 있거나 쉬는 중이면 다음 편지를 받지 않는다 */
export function canReceiveNextLetter(letters: Letter[], now: Date, paused: boolean): boolean {
  if (paused) return false;
  return !letters.some((l) => isAwaitingMyAnswer(l, now));
}
