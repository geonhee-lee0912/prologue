/**
 * 추천 이유 템플릿 (FR-D)
 *
 * 모든 사용자 노출 텍스트는 이 모듈에서만 생성한다. 자유 텍스트 생성 금지.
 * (CLAUDE.md 9장 금지 표현: 운명/완벽/보장/100%/프롤로그가 알아서 등)
 *
 * 참고:
 * - docs/08_추천_알고리즘_기준서_v_0_1.md
 * - docs/prologue_02_copy_tone_guide_v0.1.md
 */

export const INTENT_LABEL = {
  serious_long_term: '진지한 장기 관계',
  natural_dating: '자연스러운 연애',
  open_to_marriage: '결혼도 열어둔 만남',
  casual_meeting: '가벼운 만남',
  friendship_first: '친구처럼 시작하는 관계',
} as const;

export const PACE_LABEL = {
  slow: '천천히',
  moderate: '적당한 속도',
  fast: '빠르게',
} as const;

export const CONTACT_FREQ_LABEL = {
  low: '가끔',
  medium: '적당히',
  high: '자주',
} as const;

export const QUESTION_LABEL: Record<string, string> = {
  work_career: '일과 커리어',
  weekend_rest: '주말과 휴식',
  friends_family: '친구와 가족',
  taste_interests: '취향과 관심사',
  contact_frequency: '연락 빈도',
  conversation_style: '대화 스타일',
  relationship_pace: '관계 시작 속도',
  conflict_resolution: '갈등 해결',
  affection_expression: '애정 표현',
};

/**
 * 추천 이유 텍스트 빌더.
 * 각 메서드는 입력값에 따른 표현을 반환. 금지 표현 (운명/완벽/보장) 사용 금지.
 */
export const recommendationReasons = {
  matchedIntent(intent: keyof typeof INTENT_LABEL): string {
    return `두 분 모두 "${INTENT_LABEL[intent]}"을 원하고 있어요.`;
  },

  adjacentIntent(myIntent: keyof typeof INTENT_LABEL, targetIntent: keyof typeof INTENT_LABEL): string {
    return `관계 방향이 비슷해요 — ${INTENT_LABEL[myIntent]} / ${INTENT_LABEL[targetIntent]}.`;
  },

  matchedPace(pace: keyof typeof PACE_LABEL): string {
    return `관계를 ${PACE_LABEL[pace]} 시작하길 선호해요.`;
  },

  matchedContactFrequency(freq: keyof typeof CONTACT_FREQ_LABEL): string {
    return `연락은 ${CONTACT_FREQ_LABEL[freq]} 주고받는 편이에요.`;
  },

  trustComplete(): string {
    return '본인 인증과 얼굴 인증을 모두 완료한 분이에요.';
  },

  trustEmploymentAdded(): string {
    return '직업 인증까지 완료한 분이에요.';
  },

  matchedRegion(region1: string, region2?: string | null): string {
    if (region2) return `같은 ${region1} ${region2}에 거주해요.`;
    return `같은 ${region1}에 거주해요.`;
  },

  nearbyRegion(region1: string): string {
    return `${region1} 인근에 거주해요.`;
  },

  commonLifestyle(tags: string[]): string {
    if (tags.length === 0) return '';
    const shown = tags.slice(0, 4).join(', ');
    return `공통 관심사: ${shown}`;
  },

  diffLifestyle(targetTags: string[]): string {
    if (targetTags.length === 0) return '';
    const shown = targetTags.slice(0, 3).join(', ');
    return `이 분의 취향: ${shown}`;
  },

  conversationStarter(questionKey: string, answer: string): string {
    const label = QUESTION_LABEL[questionKey] ?? questionKey;
    // 답변이 너무 길면 잘라서
    const trimmed = answer.length > 60 ? answer.slice(0, 60) + '…' : answer;
    return `${label}: "${trimmed}"`;
  },

  defaultSummary(jobCategory: string | null | undefined, region1: string | undefined): string {
    const parts: string[] = [];
    if (jobCategory) parts.push(jobCategory);
    if (region1) parts.push(region1);
    if (parts.length === 0) return '오늘의 프롤로그입니다.';
    return parts.join(' · ') + ' 분이에요.';
  },

  curatorMemo(): string {
    return '관계 성향과 라이프스타일 데이터를 바탕으로 추천드렸어요.';
  },

  curatorMemoLowMatch(): string {
    return '취향은 다르지만 관계 방향이 가까운 분이에요.';
  },
};
