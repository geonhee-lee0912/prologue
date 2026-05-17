import {
  INTENT_LABEL,
  recommendationReasons as R,
} from '@prologue/shared';
import type { UserWithDetails } from './score-calculator';

export interface ReasonData {
  summaryText: string;
  matchedPoints: string[];
  differencePoints: string[];
  conversationTopics: string[];
  curatorMemo: string;
}

/**
 * 추천 이유 텍스트 생성기 (룰 기반).
 * 모든 텍스트는 @prologue/shared/recommendation-reasons 의 빌더 사용.
 * 점수 숫자는 어떤 응답에도 포함하지 않는다 (CLAUDE.md 10.2).
 */
export function generateReason(me: UserWithDetails, target: UserWithDetails): ReasonData {
  const matchedPoints: string[] = [];
  const differencePoints: string[] = [];
  const conversationTopics: string[] = [];

  // 관계 의도
  if (me.relationshipPreference && target.relationshipPreference) {
    if (me.relationshipPreference.intent === target.relationshipPreference.intent) {
      matchedPoints.push(R.matchedIntent(me.relationshipPreference.intent as keyof typeof INTENT_LABEL));
    } else {
      differencePoints.push(
        R.adjacentIntent(
          me.relationshipPreference.intent as keyof typeof INTENT_LABEL,
          target.relationshipPreference.intent as keyof typeof INTENT_LABEL,
        ),
      );
    }
    if (me.relationshipPreference.pace === target.relationshipPreference.pace) {
      matchedPoints.push(R.matchedPace(me.relationshipPreference.pace));
    }
    if (me.relationshipPreference.contactFrequency === target.relationshipPreference.contactFrequency) {
      matchedPoints.push(R.matchedContactFrequency(me.relationshipPreference.contactFrequency));
    }
  }

  // 신뢰 배지
  if (target.auth?.identityVerified && target.auth.faceMatchStatus === 'verified') {
    matchedPoints.push(R.trustComplete());
  }
  if (target.auth?.employmentVerificationStatus === 'verified') {
    matchedPoints.push(R.trustEmploymentAdded());
  }

  // 거주 지역
  if (me.user.region1 && me.user.region1 === target.user.region1) {
    if (me.user.region2 && me.user.region2 === target.user.region2) {
      matchedPoints.push(R.matchedRegion(me.user.region1, me.user.region2));
    } else {
      matchedPoints.push(R.matchedRegion(me.user.region1));
    }
  } else if (target.user.region1) {
    differencePoints.push(R.nearbyRegion(target.user.region1));
  }

  // 라이프스타일 태그
  const myTags = me.profile?.lifestyleTags ?? [];
  const targetTags = target.profile?.lifestyleTags ?? [];
  const commonTags = myTags.filter((t) => targetTags.includes(t));
  if (commonTags.length > 0) {
    const text = R.commonLifestyle(commonTags);
    if (text) matchedPoints.push(text);
    conversationTopics.push(...commonTags.slice(0, 3));
  } else if (targetTags.length > 0) {
    const text = R.diffLifestyle(targetTags);
    if (text) differencePoints.push(text);
  }

  // 대화 시작 단서 — target 의 story 답변에서 추출 (최대 2개)
  const storyAnswers = target.profileAnswers.filter((a) => a.category === 'story');
  for (const sa of storyAnswers.slice(0, 2)) {
    conversationTopics.push(R.conversationStarter(sa.questionKey, sa.answer));
  }

  const summaryText = R.defaultSummary(target.profile?.jobCategory, target.user.region1);
  const curatorMemo = matchedPoints.length > 1 ? R.curatorMemo() : R.curatorMemoLowMatch();

  return {
    summaryText,
    matchedPoints,
    differencePoints,
    conversationTopics: conversationTopics.slice(0, 4),
    curatorMemo,
  };
}
