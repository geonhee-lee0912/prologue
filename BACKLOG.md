# 보류된 작업 (BACKLOG)

다음 세션에서 챙길 수 있도록 보류 시점의 상태와 재개 방법을 기록한다.
완료되면 이 파일에서 제거.

---

## 1. 카카오 로그인 실 연동 — 검증 미완

**상태**: 백엔드 코드는 real 모드로 동작 확인. **실제 카카오 사용자로 end-to-end 검증은 미수행.**

**완료 (커밋 `7d5ef6b`)**:
- ✅ `KAKAO_USER_INFO_PROVIDER=real`, `KAKAO_REST_API_KEY` 환경변수 설정 (`apps/api/.env`, gitignored)
- ✅ `KakaoUserInfoService.realGetUserInfo()` — `GET kapi.kakao.com/v2/user/me`
- ✅ `KakaoUserInfoService.exchangeCodeForToken()` — `POST kauth.kakao.com/oauth/token`
- ✅ 새 엔드포인트: `POST /api/v1/auth/kakao/exchange-code`
- ✅ 가짜 token / 가짜 code 로 호출 시 카카오 서버에서 invalid 응답 → `KAKAO_AUTH_FAILED` 401 (즉 실 TCP/TLS 통신 확인됨)

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

## 2. 카카오 OAuth 모바일 통합 — 미구현

**상태**: 모바일 A03 화면의 카카오 버튼은 현재 **mock 토큰**으로 작동. 실제 카카오 로그인 UI 없음.

**필요한 작업**:
- [ ] `apps/mobile` 에 `expo-auth-session` + `expo-web-browser` 의존성 추가
- [ ] `apps/mobile/app/(auth)/a03-login.tsx` 의 카카오 버튼 핸들러 교체:
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

**대안 의사결정 포인트**:
- 모바일 native 에서 카카오 진짜 동작 = development build (EAS Build) 구성 필요 (1~2시간)
- 그 전까지는 Web 만 real, native 는 mock 유지 가능

---

## 3. 얼굴 인증 (FR-B02) + 사진 등록 (FR-C01) — 묶음 보류

**보류 이유**: 사용자 결정 — "완성도가 어느 정도 나오면 그때 진행". 두 기능은 상호 의존성이 강해 묶어서 보류.

**의존 관계**:
- 사진 등록 시 대표 사진과 본인 인증 결과(얼굴) 매칭 필요 (FR-C01 요구사항 6)
- 따라서 두 기능을 동시에 구현하는 게 자연스러움

**필요한 작업** (재개 시):

### 백엔드
- [ ] Supabase Storage 버킷 생성 (`photos`, `face-auth` 둘 다)
  - `face-auth` 는 운영자도 직접 SELECT 불가, 24시간 TTL
  - `photos` 는 매칭/추천 관계만 SELECT (RLS + 서명 URL)
- [ ] `/api/v1/photos` 엔드포인트 (multipart 또는 signed URL 패턴)
  - 업로드 → mock 사진 검수 → Photo 레코드 생성
  - 대표 사진 변경, 삭제
- [ ] `/api/v1/verification/face` 엔드포인트
  - 라이브 셀피 업로드 + 대표 사진과 얼굴 매칭
  - `MockFaceVerificationProvider` 결과로 `UserAuth.faceMatchStatus` 갱신
- [ ] 24시간 TTL 자동 삭제 cron (`face-auth` 버킷)

### 모바일
- [ ] C02 사진 등록 화면 (대표 + 추가, 갤러리 선택 / 카메라)
- [ ] B02 얼굴 인증 화면 (셀피 촬영)
- [ ] expo-camera 통합

### 스키마
- 기존 `Photo` 모델 활용. 마이그레이션 없음.

### RLS
- [ ] `supabase/policies/photos.sql` 작성 (own SELECT + 매칭/추천 관계 SELECT)

**현재 상태**:
- Photo, UserAuth.faceMatchStatus 스키마는 이미 존재
- `MockFaceVerificationService` + `MockPhotoModerationService` 도 이미 작성됨 (`apps/api/src/infra/`)
- 엔드포인트만 추가하면 동작 가능

---

## 4. (기록용) 다음 우선순위 후보

`README.md` 의 "Phase 4 — FR-B 이후" 와 동일. 카카오 작업 재개 외에 진행 가능한 항목:

- **FR-B02 얼굴 인증** — `MockFaceVerificationProvider` 활용, 사진 업로드 + 검증
- **FR-C 프로필 작성** — 자기소개, 라이프스타일 태그, Supabase Storage 사진 업로드
- **FR-D 추천 시스템** — 점수 6요소 계산, 추천 카드, 매칭 리포트
- **RLS 보강** — 미작성 테이블 (photos, matches, conversations, contact_exchanges, reports, blocks, user_consents, user_auths, recommendation_reasons, profile_answers, relationship_preferences, refresh_tokens, payments, admin_*) RLS 정책 작성

---

## 재개 방법

이 파일에 적힌 항목 중 하나를 다시 진행할 때:

1. 이 BACKLOG.md 의 해당 항목을 클로드에게 보여주거나 링크
2. 클로드가 컨텍스트(완료 부분 / 남은 작업)를 보고 이어서 진행
3. 완료되면 해당 항목 삭제, 커밋
