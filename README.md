# 프롤로그 (Prologue)

가볍지 않은 만남을 위한 인증 기반 진지한 소개팅 앱.

> 좋은 만남은, 좋은 첫문장에서 시작됩니다.

---

## 현재 진행 상태

- ✅ **Phase 0** 모노레포 골격 + GitHub 푸시 + 기획 문서 26개 정리
- ✅ **Phase 1** Supabase dev 프로젝트 연결 + 환경 변수 세팅
- ✅ **Phase 2** Prisma 초기 마이그레이션 (21 테이블, 29 enum, snake_case 컬럼, UUID User.id) + RLS 4종
- ✅ **Phase 3** NestJS 횡단 골격
  - `/api/health`, `/api/docs` (Swagger), `/api/v1/me`
  - Supabase JWT 가드, `@Public`/`@CurrentUser` 데코레이터
  - 글로벌 ExceptionFilter + ResponseInterceptor (`{ data }` / `{ error }`)
  - Pino 로거 (PII 마스킹), Throttler (60req/min)
  - Prisma/SupabaseModule, 외부 서비스 인터페이스 + mock 6종
- ⏳ **Phase 4** P1 기능 (FR-A ~ FR-H) 구현 중

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

---

## 외부 서비스 (로컬 개발에서는 mock 으로 동작)

| 영역 | 운영 | 로컬 개발 (현재) |
|---|---|---|
| Database / Auth / Storage / Realtime | Supabase prod | Supabase dev |
| 본인 인증 | PASS / NICE | `MockIdentityVerificationService` |
| SMS | NHN Toast | `MockSmsService` (콘솔에 OTP 출력, 휴대폰 뒷자리만) |
| 얼굴 인증 | AWS Rekognition / Clova | `MockFaceVerificationService` (항상 matched=true) |
| 사진 검수 | AWS Rekognition Moderation | `MockPhotoModerationService` |
| 푸시 | Expo Push | `MockPushService` |
| 결제 | 토스 / IAP | `MockPaymentService` |

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

---

## 라이선스

내부 사용. 외부 공개 전 별도 결정.
