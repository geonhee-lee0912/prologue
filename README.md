# 프롤로그 (Prologue)

**진열되지 않는 소개팅.** 여성은 아무에게도 노출되지 않고, 남성은 조건이 아니라 성의로 검증되며, AI는 사람에게는 못 하는 말을 받아 다음 소개를 좋게 만든다.

컨셉과 하드룰은 [`CLAUDE.md`](./CLAUDE.md), 그 근거는 [컨셉 재설정 문서](docs/superpowers/specs/2026-09-02-컨셉-재설정-design.md)에 있다.

---

## 현재 상태

**2026-09 컨셉을 백지에서 재설정했다.** 이전의 "인증 기반 진지한 소개팅 앱" 기획과 그 기준으로 만든 코드는 폐기됐다.

- ✅ 컨셉 재설정 v2.5, CLAUDE.md v0.3 (하드룰 8가지), 화면 흐름 설계 v0.2
- ✅ 폐기된 기획 문서 21종을 `docs/archive/` 로 이동
- ✅ 폐기된 코드 제거 — 추천·관심·대화 API, 4탭 화면, 추천 카드, 조건표형 프로필 편집
- ✅ Prisma 스키마 베이스라인 재생성 (`20260917000000_reset_for_concept_v2`)
- 옛 코드는 git 태그 `v0-old-concept` 에 있다: `git checkout v0-old-concept -- <경로>`

### 남아 있는 것

| 영역 | 내용 |
|---|---|
| 백엔드 골격 | Supabase JWT 가드, 예외 필터, 응답 인터셉터, PII 마스킹 로거, Throttler, Prisma·Supabase 모듈, 외부 서비스 인터페이스 + mock |
| 인증 | 본인 인증으로 가입(PASS/NICE mock), SMS OTP·카카오 로그인, refresh token 회전 |
| 계정 | 내 정보, 인증 상태, 얼굴 인증, 계정 탈퇴 |
| 안전 | 신고, 차단 |
| 운영자 도구 | 로그인, 사용자 관리, 사진·재직 검수, 신고 처리 |
| 모바일 | 앱 IA v2 화면 골격이 mock 데이터로 섰다 — 4탭(친구/대화/내 이야기/설정), 갈피 대화방·갈피의 방, 편지, 가벼운 소개, 사람 대화방. 스플래시·로그인(A03)·인증 상태·탈퇴·신고 화면은 옛 구조로 남아 있고, 백엔드가 붙을 때 새 구조에 다시 잇는다 |

옛 컨셉 기준으로 남아 있어 손봐야 할 코드와 알려진 문제는 [`BACKLOG.md`](./BACKLOG.md)에 있다.

### 다음

[화면 흐름 설계](docs/superpowers/specs/2026-09-11-화면-흐름-설계.md) 9절 순서를 따른다. **앱(Expo)으로 만들고, 백엔드보다 화면을 먼저 만든다.**

1. 화면별 카피·디자인 다듬기 — 사용자 노출 문구는 PR에서 확인한다(CLAUDE.md 9.3)
2. [AI 인터뷰 엔진 계획](docs/superpowers/plans/2026-09-11-ai-인터뷰-엔진.md)을 화면에 맞게 조정해 실행 — 화면이 기대하는 모양은 `apps/mobile/domain/types.ts` (화면용 뷰 모델 — 응답 DTO는 같은 파일 맨 위의 서버 계약을 따른다)
3. 실제 AI를 붙이기 전에 진입 흐름(동의 3종 → 기본 정보·사진)을 세운다 — 민감정보·국외이전은 별도 동의(CLAUDE.md 10.2b·10.2c)

코드 밖의 우선순위(커뮤니티 침투 경로, 남성 측 가치 명제, 법률 자문 등)는 컨셉 문서 11장에 있다.

### 모바일 미리보기 (mock)

```bash
corepack pnpm --filter mobile web
```

http://localhost:8081 — 처음엔 "첫 실행" 시나리오(갈피 대화방). 설정 탭 아래 "개발용" 패널에서 시나리오 8종과 팔레트 3종을 바꿀 수 있다. 휴대폰 프레임으로 보려면 `node scripts/device-frame.mjs` 후 http://localhost:8090. 규칙 테스트는 `corepack pnpm --filter mobile test`.

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
(두 문서 모두 컨셉 재설정 전에 쓰였다. 기술 결정은 유효하지만 기능 서술은 옛 컨셉 기준이다)

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
├─ supabase/    # RLS 정책 SQL, RLS 일괄 적용 스크립트
└─ docs/        # 현행 설계는 docs/superpowers/, 정책 문서 일부는 docs/ 바로 아래, 폐기된 기획은 docs/archive/
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

베타 직전에 필요한 계약·계정:

- 본인 인증 (PASS 또는 NICE), SMS (NHN Toast 권장)
- Apple Developer ($99/년), Google Play ($25 1회)
- OpenAI API — 무보존(zero data retention) 적용 조건 확인 필요 (컨셉 문서 8.4)
- AWS (Rekognition 을 쓸 경우), Sentry (선택)

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
#    ⚠️ 지금은 중간에 실패한다 — BACKLOG.md 1번 참고
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

엔드포인트 목록은 Swagger UI(`/api/docs`)가 기준이다. 옛 컨셉 기준으로 남아 있는 엔드포인트(온보딩 설문·서약, 프로필)는 BACKLOG.md 3번에 있다.

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

실 연동은 외부 서비스 계약 후에 한다.

---

## 화면 ID

현행 화면 ID는 [화면 흐름 설계](docs/superpowers/specs/2026-09-11-화면-흐름-설계.md)의 A1~G5 다. 앱 전체가 하나의 주선자 대화창이라 B(인터뷰)·C(대기)·D(소개) 화면은 `(main)/index.tsx` 안에서 일어난다.

옛 화면 ID(A01~K05)와 기능 ID(FR-*)는 폐기된 기획서 기준이다. 기존 파일명(`a03-login.tsx`, `j07-withdraw.tsx`)과 컨트롤러 JSDoc 에만 남아 있다.

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

### 자주 막히는 지점

**DATABASE_URL 연결이 안 된다**

Supabase 대시보드 → Settings → Database → Connection string 의 두 모드를 구분한다.

- **Pooler (port 6543, pgbouncer)**: 일반 쿼리용. `DATABASE_URL` 에 넣는다
- **Direct (port 5432)**: 마이그레이션용. `DIRECT_URL` 에 넣는다 (Prisma `datasource` 의 `directUrl`)

**RLS 때문에 데이터가 안 보인다**

의도된 동작이다. 모바일은 RLS 가 허용한 데이터만 SELECT 할 수 있다. 디버깅할 때는 Supabase Studio → Authentication → Users 에서 테스트 사용자를 만들고 그 토큰으로 시도한다. NestJS 는 service role key 로 접근하므로 RLS 를 우회한다.

**Supabase Realtime 메시지가 도착하지 않는다**

- 해당 테이블이 Realtime publication 에 들어 있는지 확인한다: `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`
- RLS 정책이 SELECT 를 허용해야 구독도 된다

---

## 라이선스

내부 사용. 외부 공개 전 별도 결정.
