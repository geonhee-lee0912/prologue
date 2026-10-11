# 보류된 작업 (BACKLOG)

다음 세션에서 챙길 수 있도록 보류 시점의 상태와 재개 방법을 기록한다.
완료되면 이 파일에서 제거.

마지막 정리: 2026-10-11 (8. 앱 IA v2 화면 골격의 남은 일, 9. 최종 점검 — 보안·운영 차단)

---

## 1. ⚠️ RLS 정책 파일이 9/17 스키마 정리를 반영하지 않았다 — `pnpm db:rls` 실패

**상태**: 9/17 베이스라인 재생성(`ca7f25a`)에서 `recommendations`, `recommendation_reasons`, `user_actions` 테이블이 사라졌지만 `supabase/policies/` 는 그대로다.

- `recommendations.sql`, `recommendation_reasons.sql`, `user_actions.sql` — 없는 테이블이 대상이다
- `photos.sql`, `profiles.sql` — `select_recommended_*` 정책이 없는 `recommendations` 테이블을 조회한다

`supabase/apply-policies.js` 는 파일을 이름순으로 `ON_ERROR_STOP=1` 로 실행하므로 **`photos.sql` 에서 멈춘다.** 그 뒤의 `profile_answers`, `profiles`, `relationship_preferences`, `reports` 정책은 적용되지 않는다.

**확인할 것**: 9/17 커밋 안내대로 dev DB 에 `prisma migrate reset` 을 했다면 테이블이 RLS 없이 다시 만들어졌다. `reports`, `profiles` 등에 RLS 가 꺼져 있을 수 있다. dev 에는 실사용자 데이터가 없지만 prod 배포 전에는 반드시 고쳐야 한다.

**할 일**:
- [ ] 없는 테이블이 대상인 정책 파일 3개 삭제
- [ ] `photos.sql`, `profiles.sql` 에서 `select_recommended_*` 정책 제거. 소개(introduction) 테이블이 생기면 그때 다시 설계한다
- [ ] dev DB 에 `pnpm db:rls` 재적용 후 테이블별 RLS 활성화 확인
- [ ] 정책 단위 테스트 추가 (CLAUDE.md §14). 지금은 RLS 테스트가 하나도 없다

---

## 2. RLS 정책이 없는 테이블

`users`, `refresh_tokens`, `user_consents`, `user_auths`, `admin_users`, `admin_reviews`, `admin_audit_logs` 에 정책 파일이 없다.

모바일이 직접 읽지 않는 테이블이라도 RLS 를 켜고 정책을 두지 않아(= anon/authenticated 접근 차단) service role 만 접근하게 해야 한다. 특히 `user_auths`(본인인증 해시)와 `refresh_tokens`.

---

## 3. 옛 컨셉 기준으로 남아 있는 코드

9/17 정리에서 개념이 유지되는 것은 남겼다. 아래는 해당 화면을 새로 만들 때 다시 판단한다.

| 코드 | 지금 상태 | 새 컨셉에서 |
|---|---|---|
| `apps/api/src/onboarding/`, `packages/shared/src/onboarding.ts` | 관계 목적 설문, 매너·싱글 서약 (옛 FR-B03~B06) | 새 온보딩은 동의 3종 → 기본 정보 → AI 인터뷰(화면 흐름 A2·A3·B). 교체 대상 |
| `apps/api/src/profile/` | 자기소개 + 라이프스타일 태그 | 조건표형 프로필 편집 화면은 삭제됨. 프로필 구성은 D1 소개 카드를 설계할 때 정한다 |
| `apps/api/src/verification/` (얼굴 인증) | API 만 남음. 모바일 진입점은 프로필 편집 화면과 함께 삭제됨 | 새 온보딩에 둘지 미정 |
| `apps/api/src/contact-exchanges/` | API 만 남음. 대화 API 는 만료 정책 때문에 제거됨 | E2 연결된 대화를 설계할 때 같이 본다 |
| 스키마의 옛 흔적 | `MembershipType`(Plus 구독), `Profile.completionScore`, `RelationshipPreference`·`ProfileAnswer`(옛 설문) | 관련 화면을 만들 때 정리 |

---

## 4. 문서

- **CLAUDE.md** — 컨셉 재설정과 어긋나는 곳이 남아 있다
  - 2장: NestJS 역할에 "추천 배치"
  - 7.2·7.3장: 예시와 금지 규칙이 삭제된 테이블(`recommendations`, `user_actions`) 기준
  - 8장: 화면 ID·파일 명명이 옛 구조(A01~K05, `(tabs)/home.tsx`) 기준. 현행은 화면 흐름 설계의 A1~G5 + 단일 대화창
  - 14장: "추천 점수 계산은 단위 테스트로 6개 차원 모두 검증" — 13장에서 폐기한 체계
- **`DEVELOPMENT_SPEC.md`, `09_아키텍처_의사결정_v0_2.md`** — 컨셉 재설정 전 문서다. 기술 결정은 유효하지만 기능 서술(추천 배치, 대화 만료 등)은 옛 컨셉 기준
- **`supabase/README.md`** — 실제와 다른 흐름을 설명한다(`supabase db push`, 없는 `migrations/`·`functions/`·`seed/` 디렉터리). 실제는 `prisma migrate` + `pnpm db:rls`

---

## 5. 카카오 로그인 실 연동 — 검증 미완

**상태**: 백엔드 코드는 real 모드로 동작 확인. **실제 카카오 사용자로 end-to-end 검증은 미수행.**

**완료 (커밋 `7d5ef6b`)**:
- ✅ `KAKAO_USER_INFO_PROVIDER=real`, `KAKAO_REST_API_KEY` 환경변수 설정 (`apps/api/.env`, gitignored)
- ✅ `KakaoUserInfoService.realGetUserInfo()` — `GET kapi.kakao.com/v2/user/me`
- ✅ `KakaoUserInfoService.exchangeCodeForToken()` — `POST kauth.kakao.com/oauth/token`
- ✅ 엔드포인트: `POST /api/v1/auth/kakao/exchange-code`
- ✅ 가짜 token / 가짜 code 로 호출 시 카카오 서버에서 invalid 응답 → `KAKAO_AUTH_FAILED` 401 (실 TCP/TLS 통신 확인됨)

**남은 작업**:
- [ ] **카카오 Developer Console 설정**
  - 내 앱 → 제품 설정 → 카카오 로그인 → Redirect URI 등록
  - 최소 1개 등록 필요 (예: `http://localhost:3000/oauth` 또는 production URL)
  - 동의항목: 닉네임/프로필 사진(기본), 카카오계정(이메일) 선택사항
- [ ] **실 토큰으로 end-to-end 검증**
  1. 브라우저에서 인가 URL 열기:
     ```
     https://kauth.kakao.com/oauth/authorize?client_id=ea53415a27efd05ef6517e48310a983e&redirect_uri=<등록한URI>&response_type=code
     ```
  2. 카카오 로그인 → redirect URL 의 `?code=XXX` 복사
  3. 백엔드에 `code` 전달 → `accessToken` 받음:
     ```bash
     curl -X POST http://localhost:3001/api/v1/auth/kakao/exchange-code \
       -H "Content-Type: application/json" \
       -d '{"code":"<code>","redirectUri":"<등록한URI>"}'
     ```
  4. accessToken 으로 카카오 로그인 (미가입자라 첫 호출은 `KAKAO_NOT_REGISTERED` 정상):
     ```bash
     curl -X POST http://localhost:3001/api/v1/auth/login/kakao \
       -H "Content-Type: application/json" \
       -d '{"kakaoAccessToken":"<accessToken>"}'
     ```
  5. 가입 흐름 (`/identity/start` → `/identity/complete`) 으로 사용자 생성
  6. 다시 로그인 → 200 + JWT 받아지면 성공

**키 회전 (필요 시)**: developers.kakao.com → 내 앱 → 앱 키 → 재발급

---

## 6. 카카오 OAuth 모바일 통합 — 미구현

**상태**: 모바일 A03 화면(`apps/mobile/app/(auth)/a03-login.tsx`)의 카카오 버튼은 **mock 토큰**으로 작동한다. 실제 카카오 로그인 UI 없음.

**필요한 작업**:
- [ ] `apps/mobile` 에 `expo-auth-session` + `expo-web-browser` 의존성 추가
- [ ] A03 의 카카오 버튼 핸들러 교체:
  - `useAuthRequest()` 로 카카오 OAuth 시작
  - `authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize'`
  - `tokenEndpoint: 'https://kauth.kakao.com/oauth/token'`
  - 받은 code 를 백엔드 `/auth/kakao/exchange-code` 로 전달
  - 받은 accessToken 으로 `/auth/login/kakao` 또는 `/auth/identity/start`
- [ ] Redirect URI 등록 (카카오 콘솔):
  - Expo Web: `http://localhost:8081`
  - 모바일 development build: `prologue://oauth` (custom scheme — 이미 app.json 설정됨)
- [ ] ⚠️ **Expo Go 한계**: custom scheme redirect 미지원 → development build 필요
  - 또는 Expo's Auth Session proxy `https://auth.expo.io/@user/slug` 사용 (deprecated 예정)
  - 또는 Web 만 지원하고 native 는 development build 만으로 — 결정 필요

**의사결정 포인트**:
- 모바일 native 에서 카카오 진짜 동작 = development build (EAS Build) 구성 필요 (1~2시간)
- 그 전까지는 Web 만 real, native 는 mock 유지 가능
- 새 온보딩(화면 흐름 A1~A3)에서 로그인 수단을 무엇으로 할지 먼저 정해야 한다

---

## 7. 얼굴 인증 이미지 24시간 TTL cron

**상태**: 매칭 성공 시 셀피는 즉시 폐기된다. 매칭 실패 시 운영자 검수용으로 `face-auth` 버킷에 남는데, 24시간 뒤 지우는 cron 이 없다(`apps/api/src/verification/face.service.ts`).

**남은 작업**:
- [ ] 24시간 지난 `face-auth` 버킷 객체 자동 삭제 (cron + BullMQ 도입 시 함께)
- 새 온보딩에 얼굴 인증을 두지 않기로 하면 이 항목 대신 기능 자체를 정리한다 (3번 표 참고)

---

## 8. 앱 IA v2 화면 골격 — 남은 일 (2026-10-11)

**상태**: `feat/mobile-ia-v2`에서 4탭 화면 골격(친구/대화/내 이야기/설정)이 mock 데이터로 섰다 — 계획 `docs/superpowers/plans/2026-10-10-앱-ia-v2-화면-골격.md`. 단계별 검토와 브랜치 전체 검토에서 미룬 것을 모았다.

### 정해야 할 것 (제품)
결정됨(2026-10-11, 반영 완료): 편지 기한은 시각까지 적는다, AI 고지는 "다른 사용자에게 보여주지 않아요" + 편지·리포트에 "이 편지는 AI가 썼어요", 가벼운 소개는 나가기를 켠 사람끼리만 주고받는다, 팔레트는 흰 바탕 모노톤 + 코랄 표시, 글꼴은 전부 Pretendard(IA 10.6).

- [ ] 사람 대화방 "첫 장" — 대화의 첫 항목(지금) vs 위에 고정된 막대(갈피 대화방 공지처럼). **페이지별로 구체화할 때 정한다**
- [ ] 끝난 대화 — **일정 기간 남긴다**(신고에 필요할 수 있어서). 기간과 그 뒤 처리는 나중에 정한다
- [ ] 대화방 배경 바꾸기(테마) — 기본은 흰색, 카톡 테마처럼 나중에 고른다. 갈피 대화방은 서고 장면(서가 + 창가), 사람 대화방은 장면 없음(갈피가 없는 곳). 시간대는 기기 시계로 먼저, 날씨는 생활권으로 NestJS 를 거쳐 날씨 API(진짜/mock 스위치, CLAUDE.md 11장). 갈피에게는 위치 없이 날씨 상태만. 테마는 무료(하드룰 4). 장면 그림체(코드로 그릴지 이미지로 만들지)는 **갈피 대화방 고도화 때** 정한다
- [ ] 친구 탭 "○○ 님과 연결됐어요" 카드의 이름 — 한 번 뜨는 알림이라 쓰는 것으로 판단함
- [ ] 기념품이 수락·만남 후기에만 주어진다 — 넘김보다 수락을 보상하는 셈
- [ ] 편지 잠시 쉬기를 켜도 "편지를 쓸지 고민 중인 분이 있어요"가 뜬다

### 실제 사용자 전에 꼭
- [ ] 진입 흐름(동의 3종 → 기본 정보·사진). 민감정보·국외이전 별도 동의는 실제 AI를 붙이기 전에(CLAUDE.md 10.2b·10.2c)
- [ ] 신고·차단, 결정 설명 요청 창구(10.2d), 민감정보·국외이전 동의 철회 위치 — 지금은 "준비 중"
- [ ] 되돌릴 수 없는 동작에 확인 단계 — 연결 끝내기, 갈피 빼기("정말 뺄게요"가 같은 자리에 떠서 두 번 누르면 바로 지워진다)
- [ ] "지난 대화"를 접힌 묶음으로(지금은 늘 펼쳐진 목록)
- [ ] 가벼운 소개 노출 스위치에 접근성 이름

### 카피 패스 (CLAUDE.md 9.3 확인)
- [ ] 금지 표현 정적 테스트부터 — 도메인의 모든 문구에 9.1 목록과 종교·건강·성생활
- [ ] mock 문구(갈피 일상 말, 서고 일지, 인터뷰 대본), "서고에만 남아요", 가벼운 소개 넘김 문구·캡션 글꼴, "곧 열려요", 대화 탭 빈 화면 문구, "갈피 빼기"(삭제 버튼이라 담백하게)
- [ ] 화면 문구 속 이모지(친구 탭 "✉️ 갈피가 편지를 썼어요", 책장 "📖")를 아이콘으로 바꿀지 — 모노톤 화면에서 색이 튄다. 갈피의 말 속 이모지(갈피 문서 3.6④)는 그대로
- [ ] 첫 만남 표정 — 손 흔들기 다음 궁금함(갈피 문서 3.6③)

### 디자인·다듬기 패스
- [ ] **갈피 이미지 투명 배경 — 필수.** 흰 바탕에서 크림색 네모가 더 드러난다(방·대화방 이모티콘). front.png 오른 소매 잘림. 이모티콘은 카디건 이전 표정 시트(r3)라 다시 뽑아야 한다(갈피 문서 3.5)
- [ ] 웹에서 한국어가 단어 중간에서 끊긴다(`wordBreak: 'keep-all'`, iOS `lineBreakStrategyIOS`)
- [ ] 갈피 아바타 묶어 보이기, 44pt 터치 영역 (색 대비는 팔레트 확정으로 해결 — `theme/tokens.spec.ts`)
- [ ] 갈피 대화방의 "가볍게 볼 분이 있어요 · 열기" 초대 버튼이 먹색이라 내 말풍선과 비슷해 보인다 — 갈피 대화방 고도화 때
- [ ] 편지 리본(코랄 `mark`) — 편지 생김새를 정할 때(IA 12장 6번)
- [ ] 갈피의 방: 책장 칸 수 상수, 열어 둔 채 19시가 지나도 밤으로 안 바뀜, RoomScene 색 토큰, 웹에서 ✕ 바깥 테두리
- [ ] 편지: 넘긴 이유 화면의 뒤로가기·취소, 칩 key, 끝난 연결 편지의 "대화하러 가기"
- [ ] 취향 카드를 고르면 반응 없이 사라진다

### 기기(네이티브) 패스
- [ ] iOS 키보드·안전 영역, Android 뒤로가기(첫 실행 화면, 메뉴 열린 채), 모달 동작, 밤 화면 상태바, `keyboardShouldPersistTaps`

### 백엔드를 붙일 때 (계약)
- [ ] 응답 DTO는 `apps/mobile/domain/types.ts` 맨 위 서버 계약을 따른다 — 고르기 전엔 이야기 한 줄만, 넘긴 이유는 응답에 넣지 않음, 끝난 연결의 사진·답한 가벼운 소개는 다시 보내지 않음
- [ ] 가벼운 소개 초대·소식은 '가벼운 소개에 나가기'를 켠 사람에게만 보낸다(mock 은 시트에서 안내만 한다)
- [ ] 만료·답하기는 서버가 강제(mock 은 화면에서만 막는다), 질문 넘기기를 답으로 세지 않기(`POLICY.interview.minTurns`)
- [ ] 넘긴 이유는 화면 문구가 아니라 shared enum 으로 저장
- [ ] 서로 수락한 가벼운 소개 → 대화방 첫 장(사진 + 이유 한 줄) 경로
- [ ] 갈피 빼기의 실제 삭제와 "제가 읽은 당신" 다시 쓰기
- [ ] 갈피 대화방 첫 말: 서로 수락(1순위)을 아직 안 열었으면 만남 질문이 늦어진다. 고민 중·오랜만 첫 말은 하루 한 번 반복된다(알림 설계 때 정하기)
- [ ] `beginSession`이 두 번 불리면 "오랜만이에요"가 사라진다

### 테스트·코드 정리
- [ ] 도메인 테스트 빈칸: 시간 함수 경계, 편지 몇 경우, 소식 날짜, 오랜만 경계, 기념품 한 번만, `removeChapter`·`setSetting`, 가벼운 소개 수락
- [ ] `canGoBack ? back : replace` 반복(5곳), 갈피·사람 대화방 입력줄 중복, 전체 store 구독
- [ ] `apps/mobile` eslint 설정 없음, `vitest.config.mts`가 tsconfig 밖

### 의존성·admin
- [ ] `@expo/vector-icons`를 package.json에 선언, expo-font ~14.0.12, admin `@types/react-dom` peer 경고, `next-env.d.ts`
- [ ] admin 폼: React 19가 액션 오류 뒤 입력을 비운다(신고 처리 메모가 사라진다)

### 문서
- [ ] IA 스펙 3.5 메시지 종류에 "넘긴 이유"가 남아 있다(D2는 편지 페이지로 옮김), README 미리보기 절 두 개, CLAUDE.md 8.1 예시 파일과 12장 `packages/shared/policy.ts` 경로, 화면 흐름 설계 9행 "내 서고"

---

## 9. ⚠️ 최종 점검 — 보안·운영 차단 (출시 전 반드시)

**상태**: 2026-10-11 전체 점검에서 확인. 앞으로 만들 코드에서도 계속 엮이므로 지금 고치지 않고, **실제 사용자를 받기 전 최종 점검에서 한꺼번에 처리**한다(사용자 결정). 그때까지 목록에서 빼지 않는다.

**먼저 확인**
- [ ] dev Supabase 의 RLS 실제 상태 — `users`, `refresh_tokens`, `user_auths`, `user_consents`, `admin_users`, `admin_reviews`, `admin_audit_logs` 7개 테이블은 정책 파일이 없다. RLS 가 꺼져 있으면 anon 키로 전화번호 해시·관리자 비밀번호 해시를 읽을 수 있다(1·2번 항목과 함께)
- [ ] `pnpm db:rls` 가 `photos.sql`에서 멈춘다 — 1번 항목

**서버(API)**
- [ ] 외부 서비스 mock 이 고정돼 있다 — `apps/api/src/infra/infra.module.ts`(SMS·본인인증·얼굴·사진 검수·푸시·결제). env 로 진짜/mock 을 고르는 스위치와 운영에서 mock 을 막는 장치가 없다. 특히 mock 본인인증은 앱이 보낸 신원 정보를 그대로 인정한다
- [ ] Swagger 가 항상 열려 있다(`main.ts`), `ALLOWED_ORIGINS`가 비면 CORS 전부 허용
- [ ] 인증번호·본인인증 세션·요청 제한이 서버 메모리에 있다 — Redis 로(서버 여러 대·재시작에 깨진다)
- [ ] 신고·차단 API 가 상대 ID 를 앱에서 받는다 — 새 컨셉은 상대 내부 ID 를 앱에 주지 않으므로 연결 기준으로 다시 설계
- [ ] `contact-exchanges`는 쓰지 않는다 — 연락처를 `messages.content`에 평문으로 남기고 응답에 상대 UUID 를 넣는다(CLAUDE.md 10.1·10.2)
- [ ] 탈퇴가 상태만 바꾼다 — 사진·개인정보 파기와 보관 기간 처리 없음
- [ ] `prisma/seed.ts`가 지운 모델(`userAction`)을 불러 깨져 있다

**관리자**
- [ ] `apps/admin/.env.example`에 service role 키 자리가 있다 — NestJS 에만 둔다(CLAUDE.md 10.4)
- [ ] 세션 비밀값에 기본값 폴백(`apps/admin/src/lib/session.ts`), 운영자 역할(owner/manager/reviewer)을 강제하는 곳이 없다

**키·문서**
- [ ] 5번 항목 본문(카카오 인가 URL 예시)에 실제 REST API 키가 있고 2026-05-17 부터 원격 저장소에 있다 — 문서에서 빼고, 카카오 콘솔에서 키 재발급 또는 client secret 사용

**테스트**
- [ ] RLS 정책 테스트가 0 개다(CLAUDE.md 14장 의무)

**앞으로 새 코드에서 지킬 것** (목록이 늘지 않게)
- 새 테이블은 RLS 정책과 정책 테스트를 같이 만든다(CLAUDE.md 6·7·14장)
- 외부 서비스는 인터페이스 + 진짜/mock env 스위치 + 운영에서 mock 금지(11장)
- 응답은 DTO 로만, 상대 내부 ID·넘긴 이유·점수는 넣지 않는다(10.2). 화면용 타입이 아니라 `apps/mobile/domain/types.ts` 맨 위 서버 계약을 따른다
- AI 로 보내는 데이터는 가명처리, 민감정보 마스킹(10.2b·10.2c)
- 키·비밀값은 문서와 예시 파일에 넣지 않는다(10.4)

---

## 재개 방법

이 파일에 적힌 항목 중 하나를 다시 진행할 때:

1. 이 BACKLOG.md 의 해당 항목을 클로드에게 보여주거나 링크
2. 클로드가 컨텍스트(완료 부분 / 남은 작업)를 보고 이어서 진행
3. 완료되면 해당 항목 삭제, 커밋
