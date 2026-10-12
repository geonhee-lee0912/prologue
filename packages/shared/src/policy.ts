/**
 * 프롤로그 정책 상수
 *
 * 기획 문서에서 결정된 모든 정책 수치는 여기에 모은다.
 * 코드의 어떤 곳에서도 magic number 로 작성하지 않는다.
 *
 * 변경 시: 이 파일 수정 + 컨셉 재설정 문서 갱신 + PR 본문에 둘 다 반영했음을 명시.
 *
 * 출처: docs/superpowers/specs/2026-09-02-컨셉-재설정-design.md (5·6장)
 *       CLAUDE.md 1.1 하드룰, 12장
 *
 * 2026-09 컨셉 재설정으로 추천 점수 가중치, 대화 만료, 일일 추천 한도는 폐기됐다.
 */

export const POLICY = {
  /** 회원가입 / 인증 */
  account: {
    minAge: 19,
    targetMinAge: 26,
    targetMaxAge: 39,
    smsOtpTtlSeconds: 180,
    smsOtpMaxAttempts: 5,
  } as const,

  /**
   * 소개(주선) — 하드룰 3
   *
   * 정기 배급을 하지 않는다. 개수를 약속하지 않는다.
   * 후보 품질이 임계 미만이면 소개하지 않는다.
   */
  introduction: {
    /** 하루 상한. 실측 후 확정(TBD). 상한은 되고 "매일 N명" 약속은 안 된다 */
    dailyCap: null,
    /** 품질 임계값. 실측 전까지 미확정이므로 런타임에서 별도 주입한다. */
    minQualityThreshold: null,
    /** 넘긴 상대를 다시 소개하지 않는 기간 (일) */
    passedExclusionDays: 180,
    /** LLM 판단에 넘기기 전 규칙·임베딩으로 좁힐 후보 수 */
    llmCandidateLimit: 5,
    /** 한 번에 한 통 — 지금 편지에 답하기 전엔 다음 편지가 오지 않는다 (앱 IA 4.1) */
    oneAtATime: true,
    /** 편지 만료 (일). 만료되면 닫히고 다음 편지를 받을 수 있다 */
    letterExpiryDays: 7,
    /** 기준을 넘는 후보가 둘이면 이야기 한 줄로 하나를 고른다 */
    maxStoryChoices: 2,
  } as const,

  /** 가벼운 소개 — 하드룰 3 단서 (앱 IA 4.1~4.4) */
  lightIntro: {
    /** 본인이 켜야 다른 사람의 가벼운 소개에 나가고, 켠 사람만 가벼운 소개를 받는다 (앱 IA 4.4 양쪽 동의) */
    exposureDefault: false,
    /** 하루 상한. 실측 후 확정 */
    dailyCap: null,
    /** 그날 자정에 만료 */
    expiresAt: 'midnight',
  } as const,

  /** 갈피 — 앱 IA 3.11, 갈피 문서 3.6, AI 엔진 문서 5·7장 */
  galpi: {
    /** 갈피가 먼저 거는 말 — 하루 한 번 이하 */
    proactiveMessagesPerDay: 1,
    /** 오랜만에 왔다고 보는 기준 (일) */
    welcomeBackAfterDays: 3,
    /** 먼저 말 걸지 않는 시간 — 한국 시간 21시부터 다음 날 8시 전까지 */
    quietHours: { startHour: 21, endHour: 8 },
    /** 답 없는 먼저 말 걸기가 이만큼 이어지면 사용자가 돌아올 때까지 멈춘다 */
    maxUnansweredProactive: 2,
    /** 사용자가 이 시간 안에 말했으면 먼저 말 걸지 않는다 (시간) */
    quietAfterUserMessageHours: 6,
    /** 안전 안내 뒤 이 시간 동안은 먼저 말 걸지 않는다 (시간) */
    quietAfterSafetyHours: 24,
    /** 먼저 말 거는 시각을 정할 대화 기록이 없을 때 (한국 시간, 시) */
    defaultProactiveHour: 20,
    /** 사용자 말 한 번의 최대 글자 수 */
    maxUserMessageLength: 1000,
    /** 프롬프트에 넣는 최근 대화 수 */
    historyWindow: 20,
    /** 첫 리포트를 건넨 뒤 이만큼 지나 다시 말하면 "다음 대화"로 보고 말 놓기를 꺼낸다 (분) */
    casualOfferDelayMinutes: 60,
    /** "소개할 만큼 알게 됨" (스펙 5.4). 턴 수 바닥은 interview.minTurns */
    known: {
      minClaimsPerVisiblePage: 2,
      requiredPracticalFacts: ['smoking', 'marriage_intent'],
    },
    /** 서고 수집 (스펙 3.5) */
    ingest: {
      /** 알아가는 동안 사용자 답이 이만큼 쌓이면 바로 수집한다 */
      userTurnsPerChunk: 4,
      /** 대화가 이만큼 멈추면 수집한다 (분) */
      idleMinutes: 10,
      /** 장 하나에 담는 문장 수 */
      maxClaimsPerPage: 15,
    },
  } as const,

  /** 친구 탭 소식 — 앱 IA 3.3. 다른 사용자는 소식에 나오지 않는다 */
  feed: {
    maxItems: 5,
  } as const,

  /**
   * 연결권 — 하드룰 4
   *
   * 차감은 "양쪽 수락 후 앱 내 대화가 성립한 시점"에만.
   * 좋아요·사진 공개·대화방 개설·매칭 자체에는 과금하지 않는다.
   * 만남도 과금 대상이 아니다 (돈을 걸면 사용자가 만남을 숨겨 학습 루프가 죽는다).
   */
  credit: {
    chargeOn: 'conversationEstablished',
    /** 양쪽이 각각 이 턴 수 이상 주고받아야 대화 성립으로 본다. 실측 후 확정. */
    turnsRequiredEachSide: 2,
    /** 미사용 연결권 이월 상한 */
    carryOverLimit: 6,
    /** 연결권 유효기간 (개월) */
    expiryMonths: 6,
  } as const,

  /**
   * 대화 — 하드룰 6
   *
   * 붙잡지도 내보내지도 않는다. 체류 유도 장치를 두지 않는다.
   */
  conversation: {
    /** 만료 없음 */
    expiryDays: null,
    /** 읽음 확인 금지 */
    readReceipts: false,
    /** 온라인 상태 표시 금지 */
    onlineStatus: false,
  } as const,

  /** 연락처 교환 — 하드룰 5 */
  contactExchange: {
    requireMutualConsent: true,
    /** 동의해도 자동 노출 금지 */
    autoExposeOnConsent: false,
    /** 우리가 권하지 않는다. 유도 UI·카피 금지 */
    promote: false,
  } as const,

  /** 노출 — 하드룰 1. 진열 금지 */
  exposure: {
    searchEnabled: false,
    /** 다른 사용자를 보여주는 피드 (하드룰 1). 갈피·서고 소식(앱 IA 3.3)은 별개 */
    feedEnabled: false,
    browseEnabled: false,
  } as const,

  /** AI 인터뷰 */
  interview: {
    /** 완주로 인정하는 최소 사용자 답변 수 */
    minTurns: 12,
    /** 이 턴 수에 도달하면 더 묻지 않고 마무리한다 */
    maxTurns: 30,
    /** 중단 후 재개 리마인드 (최대 1회) */
    resumeReminderHours: 24,
    resumeReminderMaxCount: 1,
  } as const,

  /** 프로필 */
  profile: {
    minIntroLength: 30,
    maxIntroLength: 800,
    maxLifestyleTags: 8,
    minPhotosForActive: 1,
    recommendedPhotos: 3,
  } as const,

  /** 보안 */
  security: {
    bcryptRounds: 12,
    accessTokenTtl: '15m',
    refreshTokenTtl: '30d',
  } as const,

  /** 개인정보 보관 */
  privacy: {
    /** 얼굴 인증 이미지 보관 시간 */
    faceAuthImageTtlHours: 24,
    /** 신고 검토 후 메시지 보관 (일) - 법무 검토 후 확정 */
    messageRetentionAfterReportDays: 90,
  } as const,
} as const;

export type Policy = typeof POLICY;
