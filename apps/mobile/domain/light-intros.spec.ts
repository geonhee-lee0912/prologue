import { describe, expect, it } from 'vitest';
import { currentLightIntro } from './light-intros';
import { endOfLocalDay } from './time';
import type { LightIntro } from './types';

const now = new Date(2026, 9, 11, 9, 0);
const intro = (id: string, over: Partial<LightIntro> = {}): LightIntro => ({
  id,
  name: '현우',
  photoUri: null,
  age: 30,
  area: '합정',
  oneLine: '사진 찍으러 혼자 여행 다녀요',
  status: 'new',
  expiresAt: endOfLocalDay(now).toISOString(),
  ...over,
});
const receiving = (lightIntros: LightIntro[]) => ({ lightIntros, settings: { lightIntroExposure: true } });

describe('지금 보여줄 가벼운 소개', () => {
  it('답한 소개와 기한이 지난 소개는 건너뛰고, 아직 답하지 않은 첫 소개', () => {
    const intros = [
      intro('accepted', { status: 'accepted' }),
      intro('passed', { status: 'passed' }),
      intro('expired', { expiresAt: now.toISOString() }),
      intro('first'),
      intro('second'),
    ];
    expect(currentLightIntro(receiving(intros), now)?.id).toBe('first');
  });

  it('보여줄 소개가 없으면 없다', () => {
    expect(currentLightIntro(receiving([intro('accepted', { status: 'accepted' })]), now)).toBeNull();
    expect(currentLightIntro(receiving([]), now)).toBeNull();
  });

  it('나도 "가벼운 소개에 나가기"를 켜야 받는다 — 양쪽 동의 (앱 IA 4.4)', () => {
    const off = { lightIntros: [intro('first')], settings: { lightIntroExposure: false } };
    expect(currentLightIntro(off, now)).toBeNull();
  });
});
