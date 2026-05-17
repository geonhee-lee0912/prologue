import type {
  Profile,
  ProfileAnswer,
  RelationshipPreference,
  User,
  UserAuth,
} from '@prisma/client';
import { POLICY } from '@prologue/shared';

export interface UserWithDetails {
  user: User;
  auth: UserAuth | null;
  profile: Profile | null;
  profileAnswers: ProfileAnswer[];
  relationshipPreference: RelationshipPreference | null;
}

export interface ScoreBreakdown {
  total: number;
  trust: number;
  relationship: number;
  lifestyle: number;
  conversation: number;
  distance: number;
  profileQuality: number;
}

/**
 * 점수 6요소 가중치 (POLICY.recommendation.weights):
 * - 관계의도 25 · 신뢰 인증 20 · 라이프스타일 20 · 대화 스타일 15 · 근접성 10 · 프로필 품질 10
 * 합계 100.
 */
const W = POLICY.recommendation.weights;

// 의도 enum 의 가까운 짝 (adjacent intents)
const ADJACENT_INTENTS: Record<string, ReadonlyArray<string>> = {
  serious_long_term: ['open_to_marriage'],
  open_to_marriage: ['serious_long_term', 'natural_dating'],
  natural_dating: ['open_to_marriage', 'friendship_first'],
  friendship_first: ['natural_dating'],
  casual_meeting: [],
};

export function calculateScore(me: UserWithDetails, target: UserWithDetails): ScoreBreakdown {
  const trust = calcTrust(target.auth);
  const relationship = calcRelationship(me.relationshipPreference, target.relationshipPreference);
  const lifestyle = calcLifestyle(me.profile?.lifestyleTags ?? [], target.profile?.lifestyleTags ?? []);
  const conversation = calcConversation(me.profileAnswers, target.profileAnswers);
  const distance = calcDistance(me.user, target.user);
  const profileQuality = calcProfileQuality(target.profile);

  const total =
    trust + relationship + lifestyle + conversation + distance + profileQuality;

  return {
    total,
    trust,
    relationship,
    lifestyle,
    conversation,
    distance,
    profileQuality,
  };
}

function calcTrust(auth: UserAuth | null): number {
  if (!auth) return 0;
  let s = 0;
  // 신뢰 20 = identity 8 + face 8 + employment 4
  if (auth.identityVerified) s += 8;
  if (auth.faceMatchStatus === 'verified') s += 8;
  if (auth.employmentVerificationStatus === 'verified') s += 4;
  return Math.min(W.trustVerification, s);
}

function calcRelationship(
  mePref: RelationshipPreference | null,
  targetPref: RelationshipPreference | null,
): number {
  if (!mePref || !targetPref) return 0;
  let s = 0;
  // intent (max 12)
  if (mePref.intent === targetPref.intent) s += 12;
  else if (ADJACENT_INTENTS[mePref.intent]?.includes(targetPref.intent)) s += 6;
  // pace (max 8)
  if (mePref.pace === targetPref.pace) s += 8;
  else s += 3;
  // contact frequency (max 5)
  if (mePref.contactFrequency === targetPref.contactFrequency) s += 5;
  else s += 2;
  return Math.min(W.relationshipIntent, s);
}

function calcLifestyle(myTags: string[], targetTags: string[]): number {
  if (myTags.length === 0 || targetTags.length === 0) return 0;
  const common = myTags.filter((t) => targetTags.includes(t)).length;
  // 공통 태그 1개당 5점, 최대 20점
  return Math.min(W.lifestyle, common * 5);
}

function calcConversation(myAnswers: ProfileAnswer[], targetAnswers: ProfileAnswer[]): number {
  let s = 0;
  // relationship 카테고리 공통 응답 키 (max 8)
  const myRel = myAnswers.filter((a) => a.category === 'relationship').map((a) => a.questionKey);
  const targetRel = targetAnswers
    .filter((a) => a.category === 'relationship')
    .map((a) => a.questionKey);
  const commonRel = myRel.filter((k) => targetRel.includes(k)).length;
  s += Math.min(8, commonRel * 2);
  // 상대의 story 답변 개수 (max 7)
  const targetStory = targetAnswers.filter((a) => a.category === 'story').length;
  s += Math.min(7, targetStory * 2);
  return Math.min(W.conversationStyle, s);
}

function calcDistance(me: User, target: User): number {
  if (!me.region1 || me.region1 === '미설정' || !target.region1 || target.region1 === '미설정') {
    return 0;
  }
  if (me.region1 === target.region1) {
    if (me.region2 && me.region2 === target.region2) return W.proximity; // 10
    return 7;
  }
  return 2;
}

function calcProfileQuality(profile: Profile | null): number {
  if (!profile) return 0;
  return Math.min(W.profileQuality, Math.round(profile.completionScore / 10));
}
