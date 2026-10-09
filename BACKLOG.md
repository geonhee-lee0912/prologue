# 보류된 작업 (BACKLOG)

다음 세션에서 챙길 수 있도록 보류 시점의 상태와 재개 방법을 기록한다.
완료되면 이 파일에서 제거.

마지막 정리: 2026-10-07 (컨셉 재설정 기준으로 갱신)

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

## 재개 방법

이 파일에 적힌 항목 중 하나를 다시 진행할 때:

1. 이 BACKLOG.md 의 해당 항목을 클로드에게 보여주거나 링크
2. 클로드가 컨텍스트(완료 부분 / 남은 작업)를 보고 이어서 진행
3. 완료되면 해당 항목 삭제, 커밋
