/**
 * 가입 직후 온보딩 (FR-B 시리즈) 정책 상수와 카피 라벨.
 *
 * 출처:
 * - docs/08_기능요구사항서_v_0_1.md (FR-B03 ~ FR-B06)
 * - docs/08_화면목록_ia_v_0_1.md (B04~B07)
 * - docs/prologue_02_copy_tone_guide_v0.1.md (5.3 인증 안내)
 */

/** FR-B 시리즈의 진행 단계. 다음 화면 결정용. */
export type OnboardingStep =
  | 'identity_verification' // FR-B01: 본인 인증 (미완료)
  | 'face_verification' // FR-B02: 얼굴 인증
  | 'age_check' // FR-B03: 나이 확인 결과 화면
  | 'relationship_survey' // FR-B04: 관계 목적 설문
  | 'manner_pledge' // FR-B05: 매너 서약
  | 'single_pledge' // FR-B06: 싱글 상태 서약
  | 'profile_intro' // FR-C: 프로필 작성
  | 'completed';

/** 관계 목적 (Prisma enum RelationshipIntent 와 동기화) */
export const RELATIONSHIP_INTENT_VALUES = [
  'serious_long_term',
  'natural_dating',
  'open_to_marriage',
  'casual_meeting',
  'friendship_first',
] as const;
export type RelationshipIntentValue = (typeof RELATIONSHIP_INTENT_VALUES)[number];

/** 관계 속도 */
export const RELATIONSHIP_PACE_VALUES = ['slow', 'moderate', 'fast'] as const;
export type RelationshipPaceValue = (typeof RELATIONSHIP_PACE_VALUES)[number];

/** 연락 빈도 */
export const CONTACT_FREQUENCY_VALUES = ['low', 'medium', 'high'] as const;
export type ContactFrequencyValue = (typeof CONTACT_FREQUENCY_VALUES)[number];

/** 결혼 가능성 (extra JSON 으로 저장) */
export const MARRIAGE_OPENNESS_VALUES = [
  'open_to_marriage', // 결혼까지 자연스럽게 열어둠
  'not_decided', // 결혼은 아직 모르겠음
  'no_marriage', // 결혼 생각은 없음
] as const;
export type MarriageOpennessValue = (typeof MARRIAGE_OPENNESS_VALUES)[number];

/** B05 설문 화면 카피 (헤더 B안 확정) */
export const RELATIONSHIP_SURVEY_COPY = {
  header: '어떤 만남을 시작하고 싶으신가요?',
  subHeader: '답에 따라 비슷한 결의 사람을 추천드려요.',
  helperNote: '한 가지만 골라주세요. 가장 가깝다고 느끼는 답이면 충분해요. 답은 마이페이지에서 언제든 수정할 수 있어요.',
  questions: {
    intent: {
      title: '지금 어떤 만남을 원하시나요?',
      options: {
        serious_long_term: '진지한 장기 관계',
        natural_dating: '자연스럽게 시작하는 연애',
        open_to_marriage: '좋은 사람을 만난다면 결혼까지 열어둠',
        friendship_first: '친구처럼 천천히 시작',
        casual_meeting: '가벼운 만남',
      } as Record<RelationshipIntentValue, string>,
    },
    pace: {
      title: '관계를 시작할 때 선호하는 속도는 어떤가요?',
      options: {
        slow: '천천히, 충분히 알아가며',
        moderate: '자연스러운 속도로',
        fast: '마음이 통하면 빠르게',
      } as Record<RelationshipPaceValue, string>,
    },
    contactFrequency: {
      title: '대화와 연락은 어느 정도를 선호하시나요?',
      options: {
        low: '가끔, 여유 있게',
        medium: '적당히, 일상 공유 정도로',
        high: '자주, 자세하게',
      } as Record<ContactFrequencyValue, string>,
    },
    marriageOpenness: {
      title: '좋은 사람을 만난다면 어느 정도의 관계까지 생각하시나요?',
      options: {
        open_to_marriage: '결혼까지 자연스럽게 열어둠',
        not_decided: '결혼은 아직 모르겠음, 지금은 연애',
        no_marriage: '결혼 생각은 없음',
      } as Record<MarriageOpennessValue, string>,
    },
  },
} as const;

/** B06 매너 서약 카피 (헤더 A안 + 본문 B안 확정 — 서약문체) */
export const MANNER_PLEDGE_COPY = {
  header: '매너 서약',
  subHeader: '좋은 만남을 위한 서비스 이용 기준을 안내합니다.',
  intro: '저는 좋은 만남을 위해 다음을 지키겠습니다.',
  clauses: [
    '잡은 약속에 책임을 지고, 사정이 생기면 미리 알리겠습니다.',
    '대화를 그만두고 싶을 때는 정중히 인사를 남기겠습니다.',
    '모욕적이거나 강요하는 표현을 사용하지 않겠습니다.',
    '직업·사진·관계 상태에 거짓 정보를 적지 않겠습니다.',
  ],
  noteOnViolation: '위 약속을 지키지 않는 행동이 신고되면, 운영자가 경고·이용 제한·계정 정지 조치를 할 수 있어요.',
  cta: '위 약속에 동의하고 계속하기',
  /** 동의 버전. 약속 문구가 바뀌면 올린다. */
  version: '2026-05-18',
} as const;

/** B07 싱글 상태 서약 카피 (헤더 A안 + 본문 A안 확정) */
export const SINGLE_PLEDGE_COPY = {
  header: '싱글 상태 서약',
  subHeader: '프롤로그는 새로운 관계를 시작할 수 있는 분들을 위한 서비스예요.',
  intro: '싱글 상태와 매너 있는 이용을 함께 약속해주세요.',
  clauses: [
    '현재 결혼 또는 사실혼 관계가 아닙니다.',
    '현재 교제 중인 상대가 없습니다.',
    '위 내용이 사실과 다르다는 신고가 접수되면 운영자가 검토할 수 있어요.',
  ],
  noteOnLegal: '본 서약은 법적 단정이 아닌 서비스 이용 기준이에요.',
  cta: '위 내용에 동의하고 계속하기',
  version: '2026-05-18',
} as const;
