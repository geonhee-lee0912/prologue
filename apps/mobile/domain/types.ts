/**
 * 앱 도메인 타입 — mock 단계.
 * 화면용 뷰 모델이다. 서버 응답 DTO 로 그대로 쓰지 않는다 — DTO 는 packages/shared 에 따로 정의한다 (CLAUDE.md 5장).
 * 서버 계약: 고르기 전에는 이야기 한 줄만 보낸다(후보의 이름·사진·조건 없이). 고른 뒤에는 고른 사람의 프로필만 보낸다.
 * 넘긴 이유(passReason)는 쓰기 전용이라 어떤 응답에도 담지 않는다 — 본인 것도 (CLAUDE.md 10.2, 7.3).
 * 끝난 연결의 사진과 이미 답한 가벼운 소개는 다시 보내지 않는다.
 * 출처: docs/superpowers/specs/2026-10-10-서비스-구성-위계-design.md
 */

/** 갈피 표정 9종 — 표정 시트(r3) 순서. 이모티콘으로도 쓴다 (IA 3.5) */
export type Expression =
  | 'welcome'
  | 'wave'
  | 'curious'
  | 'thinking'
  | 'worried'
  | 'comfort'
  | 'shy'
  | 'proud'
  | 'sleepy';

export const EXPRESSIONS: readonly Expression[] = [
  'welcome',
  'wave',
  'curious',
  'thinking',
  'worried',
  'comfort',
  'shy',
  'proud',
  'sleepy',
];

/** 편지 후보의 이야기 한 줄 — 사진·신원 없음 (IA 4.1) */
export interface StoryCandidate {
  id: string;
  storyLine: string;
}

/** 고른 후보에게서만 열리는 편지 본문 */
export interface LetterProfile {
  name: string;
  /** mock 은 null → 자리표시 */
  photoUri: string | null;
  age: number;
  /** 생활권 */
  area: string;
  /** 실용 정보 */
  practical: string[];
  /** 신뢰 배지 */
  badges: string[];
  /** 본인이 허락한 조건 정보만 (하드룰 8) */
  allowedConditions: string[];
  /** "왜 이 분인가" */
  why: string;
}

export type LetterStatus =
  | 'choosing' // 후보 둘 중 고르는 중
  | 'open' // 편지가 열림, 아직 답 안 함
  | 'acceptedWaiting' // 내가 수락, 상대 답 대기
  | 'connected' // 서로 수락
  | 'passed' // 내가 넘김
  | 'expired'; // 답 없이 만료, 또는 상대 쪽 만료

export interface Letter {
  id: string;
  /** 1~2명 */
  candidates: StoryCandidate[];
  chosenCandidateId: string | null;
  /** 열람은 revealedProfile() 로만 */
  profiles: Record<string, LetterProfile>;
  status: LetterStatus;
  sentAt: string;
  expiresAt: string;
  /** 서고에만 남는다 (하드룰 2) */
  passReason?: string;
}

/** 가벼운 소개 — 사진 중심, 한 장씩 (IA 4.1~4.3) */
export interface LightIntro {
  id: string;
  name: string;
  photoUri: string | null;
  age: number;
  area: string;
  oneLine: string;
  status: 'new' | 'accepted' | 'passed';
  expiresAt: string;
  /** 서고에만 남는다 */
  passReason?: string;
}

export type GalpiMessage =
  | { id: string; kind: 'text'; from: 'galpi' | 'me'; text: string; at: string }
  | { id: string; kind: 'emoticon'; from: 'galpi'; expression: Expression; at: string }
  | { id: string; kind: 'letter'; from: 'galpi'; letterId: string; at: string }
  | { id: string; kind: 'lightIntroInvite'; from: 'galpi'; at: string };

export interface PersonMessage {
  id: string;
  from: 'me' | 'them';
  text: string;
  at: string;
}

/** 서로 수락한 사람과의 대화 (IA 6장) */
export interface Connection {
  id: string;
  name: string;
  photoUri: string | null;
  /** 첫 장이 되는 편지 */
  letterId: string;
  ended: boolean;
  /** "서로 수락" 카드를 한 번 보여줬는지 */
  celebrated: boolean;
  messages: PersonMessage[];
  /** 안 읽은 수는 나에게만 (하드룰 6) */
  lastReadAt: string | null;
}

export interface Meeting {
  connectionId: string;
  date: string;
  feedbackGiven: boolean;
  /** 갈피가 대화방에서 이 만남을 물어본 때. 답이 없어도 다시 묻지 않는다 (갈피 문서 3.6 ③) */
  askedAt?: string;
}

/** 책장의 한 장 (IA 3.7) */
export interface Chapter {
  id: string;
  title: string;
  addedAt: string;
}

/** 하루 한 번, 사람이 아니라 장면을 둘 중 하나 고른다 (IA 7장) */
export interface TasteCard {
  id: string;
  /** localDateKey */
  date: string;
  options: [string, string];
  picked: 0 | 1 | null;
}

/** 여정의 순간에만 생기는 기념품. 돈·포인트로 살 수 없다 (IA 3.7) */
export interface Keepsake {
  id: string;
  kind: 'firstLetter' | 'firstConnection' | 'firstMeeting';
  at: string;
}

/** 내 편지 미리보기에 쓰는 내 정보 */
export interface MyProfile {
  age: number;
  area: string;
  practical: string[];
  badges: string[];
  allowedConditions: string[];
}

export interface AppState {
  userName: string;
  firstRunDone: boolean;
  /** step = 지금까지 지난 질문 수 */
  interview: { step: number; completed: boolean };
  galpiMessages: GalpiMessage[];
  galpiLastReadAt: string | null;
  letters: Letter[];
  lightIntros: LightIntro[];
  connections: Connection[];
  meetings: Meeting[];
  chapters: Chapter[];
  tasteCards: TasteCard[];
  keepsakes: Keepsake[];
  /** 반응을 바꾸는 데만 쓴다. 화면에 숫자로 보이지 않는다 */
  windCount: number;
  lastVisitAt: string | null;
  /** 이번에 열기 전의 마지막 방문 — "오랜만에 옴" 판단용 */
  previousVisitAt: string | null;
  /** 편지를 쓸지 고민 중 신호 (IA 9장) */
  considering: { hint: string } | null;
  /** 갈피가 만남 이야기를 물어본 연결 */
  askingMeetingFeedback: string | null;
  /** 갈피가 대화방에서 먼저 건넨 말 — 하루(localDateKey)에 몇 번 */
  galpiOpeners: { date: string; count: number };
  /** 서고에 이야기를 남긴 분 수 (대기 카운터) */
  archiveCount: number;
  me: MyProfile;
  settings: { lightIntroExposure: boolean; pauseLetters: boolean };
}
