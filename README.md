# 프롤로그 (Prologue)

가볍지 않은 만남을 위한 인증 기반 진지한 소개팅 앱.

> 좋은 만남은, 좋은 첫문장에서 시작됩니다.

---

## 현재 진행 상태

- ✅ **Phase 0** 모노레포 골격 + GitHub 푸시 + 기획 문서 26개 정리
- ✅ **Phase 1** Supabase dev 프로젝트 연결 + 환경 변수 세팅
- ✅ **Phase 2** Prisma 초기 마이그레이션 (22 테이블, 29 enum, snake_case 컬럼, UUID User.id) + RLS 4종
- ✅ **Phase 3** NestJS 횡단 골격
  - `/api/health`, `/api/docs` (Swagger), `/api/v1/me`
  - Supabase JWT 가드, `@Public`/`@CurrentUser` 데코레이터
  - 글로벌 ExceptionFilter + ResponseInterceptor (`{ data }` / `{ error }`)
  - Pino 로거 (PII 마스킹), Throttler (60req/min)
  - Prisma/SupabaseModule, 외부 서비스 인터페이스 + mock 6종
- ✅ **Phase 4 — FR-A** 회원가입/로그인 (통합 본인 인증 흐름)
  - 본인 인증으로 가입 (`/auth/identity/start` + `/auth/identity/complete`) — PASS/NICE mock
  - SMS OTP 로그인 (`/auth/login/otp/send` + `/auth/login/otp/verify`)
  - 카카오 OAuth 로그인 / 가입 (`/auth/login/kakao`, identity start with kakaoAccessToken)
  - **카카오 real 모드 백엔드 동작 확인** (`KAKAO_USER_INFO_PROVIDER=real`, code 교환 엔드포인트)
  - Refresh token 회전 + Logout (`/auth/refresh`, `/auth/logout`)
  - User.kakaoId, UserAuth.identityCiHash 유니크 제약
  - 모바일 A03 화면 (Expo Web/Native) + 토큰 secure storage (카카오는 mock 유지)
- 🟡 **보류된 작업** — [`BACKLOG.md`](./BACKLOG.md) 참고
  - 카카오 real 사용자 end-to-end 검증 (카카오 콘솔 redirect URI 등록 필요)
  - 모바일 real OAuth (expo-auth-session, 카카오 로그인 버튼 실 연동)
- ⏳ **Phase 4 — FR-B 이후** 얼굴 인증, 프로필 작성, 추천, 매칭, 대화, 신고/차단

---

## 아키텍처

**B안 (NestJS + Supabase 하이브리드)** 채택.

```
모바일 (Expo) ─── Supabase 직접 (단순 조회, 실시간 구독)
              └── NestJS (Railway) ─── Supabase service role
                                  └── Upstash Redis (OTP, 큐)
                                  └── 외부 서비스 (PASS/NICE, NHN Toast, Expo Push)

운영자 도구 (Next.js, Vercel) ─── NestJS Admin API
```

자세한 의사결정은 [`09_아키텍처_의사결정_v0_2.md`](./09_아키텍처_의사결정_v0_2.md)
기술 스택과 규칙은 [`DEVELOPMENT_SPEC.md`](./DEVELOPMENT_SPEC.md)
클로드 코드 작업 지침은 [`CLAUDE.md`](./CLAUDE.md)

---

## 모노레포 구조

```
prologue/
├─ apps/
│  ├─ api/      # NestJS 백엔드 (Railway)
│  ├─ mobile/   # Expo 사용자 앱
│  └─ admin/    # Next.js 운영자 도구 (Vercel)
├─ packages/
│  └─ shared/   # 공유 타입, enum, 정책 상수, 외부서비스 인터페이스
├─ supabase/    # 마이그레이션 SQL, RLS 정책 SQL, RLS 일괄 적용 스크립트
└─ docs/        # 기획/정책/브랜드 문서 26종
```

---

## 사전 요구사항

- **Node.js 20 LTS 이상** (현재 검증: v22)
- **pnpm 9 이상** (`npm i -g pnpm@9.12.0` 또는 `corepack enable`)
- **psql** (Postgres 클라이언트, RLS 적용용 — `pnpm db:rls`가 호출)
- **Supabase CLI** (선택, `prisma migrate` 와 `pnpm db:rls`만으로도 충분)
- **모바일**:
  - 실기기 Expo Go (가장 빠른 시작) — App Store / Play Store
  - 또는 Android Studio 에뮬레이터 (Windows)
  - 또는 iOS 시뮬레이터 (macOS만)
  - 또는 브라우저 (Expo Web)

**Docker 는 필요하지 않다.** Supabase Cloud 가 인프라를 대체한다.

---

## 외부 서비스 가입 / 프로젝트 생성

처음 한 번만 필요한 작업.

1. **Supabase**: [supabase.com](https://supabase.com) 가입
   - dev 프로젝트 생성 (서울 리전, 무료 티어) ✅
   - prod 프로젝트 생성 (서울 리전, Pro 플랜) — 베타 출시 직전에
2. **Upstash**: [upstash.com](https://upstash.com) — Redis (OTP / BullMQ), 베타 전까지 미뤄도 OK
3. **Railway**: [railway.com](https://railway.com) — 백엔드 호스팅, 베타 전까지 미뤄도 OK
4. **Vercel**: 운영자 도구 호스팅, 베타 전까지 미뤄도 OK

---

## 처음 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 공유 패키지 빌드 (필수 — 매 클론 후 한 번, shared 코드 변경 시마다)
pnpm --filter @prologue/shared build

# 3. 환경 변수 복사 + 채우기
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env
# .env 안에 실제 Supabase 키, DB URL, JWT secret, peppers 입력

# 4. Prisma 마이그레이션 적용 (Supabase dev DB 에)
pnpm --filter api prisma migrate deploy

# 5. RLS 정책 일괄 적용
pnpm db:rls

# 6. 백엔드 실행
pnpm --filter api dev
#  → http://localhost:3001/api/health
#  → http://localhost:3001/api/docs (Swagger UI)
```

### 모바일 앱 미리보기

```bash
# (A) 브라우저로 확인 — 가장 빠른 디자인 검토
pnpm --filter mobile web
# → http://localhost:8081 (Expo Metro)

# (B) 실기기로 확인 (Expo Go 앱 설치 필요)
pnpm --filter mobile dev
# → 터미널에 QR 코드 출력 → 폰 카메라로 스캔 → 핫리로드 동작
# → 단, 실기기에선 API 호출 시 EXPO_PUBLIC_API_BASE_URL 을
#   PC 의 LAN IP(예: http://192.168.x.x:3001/api/v1) 로 바꿔야 함
```

---

## 환경 변수 — 여러 컴퓨터에서 쓰기

`.env` 는 **절대 git 에 올리지 않는다.** 대신 `.env.example` 을 올려 "무엇을 채워야 하는지"만 공유하고, 값은 비밀번호 관리자에서 가져온다.

```bash
# 새 컴퓨터에서
cp apps/api/.env.example apps/api/.env
# 빈 값을 비밀번호 관리자에서 복사해 채운다
```

### 값을 어디서 구하나

| 변수 | 출처 | 잃어버리면 |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Supabase → Settings → Database | 대시보드에서 다시 본다 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | Supabase → Settings → API | 대시보드에서 다시 본다 |
| `KAKAO_REST_API_KEY` | 카카오 Developers 콘솔 | 콘솔에서 다시 본다 |
| `OPENAI_API_KEY` | OpenAI 대시보드 | 새로 발급 (기존 키는 못 본다) |
| **`PHONE_HASH_PEPPER`** | 최초 1회 생성 | **복구 불가. 아래 경고 참조** |
| `ADMIN_JWT_SECRET` | 최초 1회 생성 | 새로 만들면 기존 세션만 무효 |

```bash
# 시크릿 최초 생성
openssl rand -hex 32
```

### ⚠️ `PHONE_HASH_PEPPER` 는 반드시 백업한다

휴대폰 번호는 평문으로 저장하지 않고 `SHA-256(번호 + pepper)` 만 저장한다(CLAUDE.md §10.1). **pepper 가 바뀌면 기존 해시와 아무것도 일치하지 않아 모든 사용자가 로그인할 수 없게 된다.** 재생성으로 복구할 수 없다.

비밀번호 관리자에 반드시 보관한다. 이 값만큼은 잃어버리면 DB 를 버려야 한다.

### 여러 컴퓨터 운용 방법 세 가지

**1. 비밀번호 관리자에 secure note (권장 — 혼자 쓸 때)**

1Password·Bitwarden 등에 `.env` 내용을 통째로 secure note 로 저장하고, 새 컴퓨터에서 복사해 붙여넣는다. 파일이 몇 개 안 되고 자주 바뀌지 않으면 이게 가장 단순하다.

**2. 1Password CLI (`op`) 참조 방식**

`.env` 에 실제 값 대신 `op://` 참조를 넣고 실행 시 주입한다. 이러면 `.env` 자체에 비밀이 없어 동기화가 자유롭다.

```bash
# .env 예시
DATABASE_URL=op://Private/prologue-supabase/database_url

# 실행
op run --env-file=apps/api/.env -- pnpm --filter api dev
```

**3. Doppler / Infisical (팀이 생기면)**

전용 시크릿 관리 SaaS. 무료 티어가 있고 CLI 로 주입한다. 혼자일 때는 과하다.

### 하지 말 것

- iCloud·Dropbox 공유 폴더에 `.env` 두기 — 동기화 충돌과 유출 위험
- 카카오톡·메일로 나에게 보내기
- `.gitignore` 를 지우고 커밋 — 한 번 올라가면 history 에서 지우기 어렵다

### 운영 환경

로컬 `.env` 는 개발용이다. 운영에서는 파일을 쓰지 않는다.

| 대상 | 관리 위치 |
|---|---|
| NestJS | Railway 환경 변수 UI |
| Mobile | EAS Secret |
| Admin | Vercel 환경 변수 UI |

---

## 자주 쓰는 명령어

| 명령 | 설명 |
|---|---|
| `pnpm install` | 의존성 설치 |
| `pnpm --filter @prologue/shared build` | 공유 패키지 빌드 (변경 시) |
| `pnpm --filter api dev` | 백엔드 dev 서버 |
| `pnpm --filter mobile dev` | Expo Metro 시작 (실기기 QR) |
| `pnpm --filter mobile web` | Expo Web (브라우저 미리보기) |
| `pnpm --filter admin dev` | 운영자 도구 |
| `pnpm dev` | 모든 앱 병렬 실행 |
| `pnpm --filter api prisma studio` | DB GUI |
| `pnpm --filter api prisma migrate dev --name <설명>` | 새 마이그레이션 |
| `pnpm db:rls` | `supabase/policies/*.sql` 일괄 적용 |
| `pnpm lint` / `pnpm test` / `pnpm build` | 전체 lint / test / build |

---

## API 응답 규약

```ts
// 성공
{ "data": <T>, "meta"?: { ... } }

// 실패
{ "error": { "code": "ERROR_CODE", "message": "...", "details"?: ... } }
```

에러 코드는 [`packages/shared/src/errors.ts`](./packages/shared/src/errors.ts) 에 정의.
새 비즈니스 에러는 `AppException` + 적절한 `ErrorCode` 로 던진다.

## 현재 노출된 엔드포인트

| 경로 | 인증 | 설명 |
|---|---|---|
| `GET  /api/health` | Public | 헬스체크 |
| `GET  /api/docs` | Public | Swagger UI |
| `POST /api/v1/auth/identity/start` | Public | 본인 인증 시작 (kakao 토큰 옵션) |
| `POST /api/v1/auth/identity/complete` | Public | 본인 인증 완료 → 가입/로그인 → JWT |
| `POST /api/v1/auth/login/otp/send` | Public | SMS OTP 발송 |
| `POST /api/v1/auth/login/otp/verify` | Public | OTP 검증 → JWT |
| `POST /api/v1/auth/login/kakao` | Public | 카카오 OAuth 로그인 → JWT |
| `POST /api/v1/auth/refresh` | Public | refresh token 으로 새 access token |
| `POST /api/v1/auth/logout` | Bearer | 모든 refresh token revoke |
| `GET  /api/v1/me` | Bearer | 내 사용자 정보 |

---

## 외부 서비스 (로컬 개발에서는 mock 으로 동작)

| 영역 | 운영 | 로컬 개발 (현재) | 전환 방법 |
|---|---|---|---|
| Database / Auth / Storage / Realtime | Supabase prod | Supabase dev | env: `SUPABASE_URL` 등 |
| 본인 인증 | PASS / NICE | `MockIdentityVerificationService` | provider 인터페이스 교체 |
| SMS | NHN Toast | `MockSmsService` (콘솔에 OTP 출력, 휴대폰 뒷자리만) | provider 인터페이스 교체 |
| 카카오 로그인 | kakao API | `KakaoUserInfoService` mock 모드 | env: `KAKAO_USER_INFO_PROVIDER=real` + `KAKAO_REST_API_KEY` |
| 얼굴 인증 | AWS Rekognition / Clova | `MockFaceVerificationService` (항상 matched=true) | provider 인터페이스 교체 |
| 사진 검수 | AWS Rekognition Moderation | `MockPhotoModerationService` | provider 인터페이스 교체 |
| 푸시 | Expo Push | `MockPushService` | provider 인터페이스 교체 |
| 결제 | 토스 / IAP | `MockPaymentService` | provider 인터페이스 교체 |

실 연동은 Phase 6 (외부 서비스 계약 완료 후).

---

## 화면 ID 와 코드 매핑

기획 문서의 화면 ID(A01 ~ K05)와 기능 ID(FR-A01 ~ FR-J)를 코드에 명시적으로 노출.

- 모바일 화면 파일: `a03-login.tsx`, `b02-identity.tsx` 처럼 prefix 사용
- 백엔드 컨트롤러: JSDoc `@fr FR-XX` 로 매핑 명시
- 커밋 메시지: `feat(api): FR-B01 본인 인증 API 추가`

---

## 알려진 dev 운영 메모

- `packages/shared` 변경 후 → `pnpm --filter @prologue/shared build` 필수 (런타임은 `dist/`를 읽음)
- `nest start --watch` 의 dist race 회피 위해 `apps/api/nest-cli.json`에서 `deleteOutDir: false`
- 모바일 실기기에서 백엔드 호출 시 `localhost` 대신 PC의 LAN IP 사용
  → `apps/mobile/.env` 의 `EXPO_PUBLIC_API_BASE_URL` 을 `http://192.168.x.x:3001/api/v1` 로 변경
- 윈도우 + pnpm install 시 Defender 실시간 검사가 `node_modules/.pnpm/*_tmp_*` 폴더의
  atomic rename 을 잡을 수 있음 → 프로젝트 폴더를 Defender 제외 목록에 추가
- Expo SDK 는 폰의 Expo Go SDK 버전과 일치해야 함. 불일치 시 `npx expo install --fix`
  (단, 그 전에 `expo` 패키지 버전을 `~XX.0.0` 로 핀하고 `pnpm install` 먼저)
- 카카오 로그인 mock 모드: `KAKAO_USER_INFO_PROVIDER=mock` 일 때 access_token 의 해시로
  결정적 kakaoId 생성. 모바일에서 임의 토큰을 보내도 동일 토큰 = 동일 사용자로 시연 가능.

---

## 라이선스

내부 사용. 외부 공개 전 별도 결정.
