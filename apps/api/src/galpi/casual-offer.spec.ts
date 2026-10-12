import { describe, expect, it } from 'vitest';
import { type CasualOfferInput, shouldOfferCasual } from './casual-offer';

const NOW = new Date('2026-10-11T03:00:00Z');
const base = (over: Partial<CasualOfferInput> = {}): CasualOfferInput => ({
  speechLevel: 'mixed',
  casualOfferedAt: null,
  knownAt: null,
  userUsedCasual: false,
  sensitiveJustNow: false,
  crisis: false,
  skipped: false,
  now: NOW,
  ...over,
});

describe('말 놓기를 꺼낼 때 (스펙 5.2)', () => {
  it('사용자가 반말을 쓰기 시작하면 꺼낸다', () => {
    expect(shouldOfferCasual(base({ userUsedCasual: true }))).toBe(true);
  });

  it('첫 리포트를 건네고 60분 넘게 지나 다시 말하면 꺼낸다', () => {
    expect(shouldOfferCasual(base({ knownAt: new Date(NOW.getTime() - 61 * 60_000) }))).toBe(true);
    expect(shouldOfferCasual(base({ knownAt: new Date(NOW.getTime() - 10 * 60_000) }))).toBe(false);
  });

  it('60분은 포함, 그보다 조금 모자라면 아직이다', () => {
    expect(shouldOfferCasual(base({ knownAt: new Date(NOW.getTime() - 60 * 60_000) }))).toBe(true);
    expect(shouldOfferCasual(base({ knownAt: new Date(NOW.getTime() - 60 * 60_000 + 1) }))).toBe(false);
  });

  it('알아가는 중이고 반말도 아니면 꺼내지 않는다', () => {
    expect(shouldOfferCasual(base())).toBe(false);
  });

  it('한 번 꺼냈거나 이미 말을 놓았으면 다시 꺼내지 않는다', () => {
    expect(shouldOfferCasual(base({ userUsedCasual: true, casualOfferedAt: NOW }))).toBe(false);
    expect(shouldOfferCasual(base({ userUsedCasual: true, speechLevel: 'casual' }))).toBe(false);
  });

  it('민감한 이야기·위기·건너뛰기 직후에는 꺼내지 않는다', () => {
    expect(shouldOfferCasual(base({ userUsedCasual: true, sensitiveJustNow: true }))).toBe(false);
    expect(shouldOfferCasual(base({ userUsedCasual: true, crisis: true }))).toBe(false);
    expect(shouldOfferCasual(base({ userUsedCasual: true, skipped: true }))).toBe(false);
  });
});
