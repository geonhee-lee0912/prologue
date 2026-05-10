# 프롤로그 (Prologue)

가볍지 않은 만남을 위한 인증 기반 진지한 소개팅 앱.

> 좋은 만남은, 좋은 첫문장에서 시작됩니다.

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
│  └─ shared/   # 공유 타입, enum, 정책 상수
├─ supabase/    # 마이그레이션 SQL, RLS 정책 SQL
└─ docs/        # 기획/정책/브랜드 문서
```

---

## 사전 요구사항

- Node.js 20 LTS 이상
- pnpm 9 이상 (`npm i -g pnpm`)
- Supabase CLI (`brew install supabase/tap/supabase` 또는 `npm i -g supabase`)
- (모바일 개발) iOS 시뮬레이터 또는 Android 에뮬레이터, 또는 실기기에 Expo Go 설치

**Docker 는 필요하지 않다.** Supabase Cloud 가 인프라를 대체한다.

---

## 외부 서비스 가입 / 프로젝트 생성

처음 한 번만 필요한 작업.

1. **Supabase**: [supabase.com](https://supabase.com) 가입
   - dev 프로젝트 생성 (서울 리전, 무료 티어)
   - prod 프로젝트 생성 (서울 리전, Pro 플랜)
2. **Railway**: [railway.com](https://railway.com) 가입 (Hobby 플랜)
3. **Upstash**: [upstash.com](https://upstash.com) 가입
   - Redis 데이터베이스 생성 (서울 리전, 무료 티어)
4. **Vercel**: 이미 사용 중 (가입되어 있다고 가정)

---

## 처음 실행

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 복사 (각 앱별로)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env

# 3. .env 파일에 Supabase 와 Upstash 의 실제 값 입력
#    - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
#    - DATABASE_URL (Supabase Postgres connection string, pooler)
#    - REDIS_URL (Upstash Redis connection string)

# 4. Supabase CLI 로 dev 프로젝트 연결
supabase login
supabase link --project-ref <your-dev-project-ref>

# 5. 마이그레이션 적용 (Prisma)
pnpm --filter api prisma migrate deploy

# 6. RLS 정책 적용 (Supabase CLI)
supabase db push

# 7. 시드 데이터 (선택)
pnpm --filter api db:seed

# 8. 모든 앱 실행
pnpm dev
```

각각 따로 실행:

```bash
pnpm --filter api dev      # http://localhost:3001
pnpm --filter admin dev    # http://localhost:3002
pnpm --filter mobile dev   # Expo Dev Tools
```

---

## 자주 쓰는 명령어

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 모든 앱 병렬 실행 |
| `pnpm lint` | 전체 린트 |
| `pnpm test` | 전체 테스트 |
| `pnpm build` | 전체 빌드 |
| `pnpm --filter api prisma studio` | DB GUI |
| `pnpm --filter api prisma migrate dev --name <name>` | 마이그레이션 추가 |
| `supabase db push` | RLS 정책 / 추가 SQL 을 dev 프로젝트에 적용 |
| `supabase link --project-ref <ref>` | Supabase 프로젝트 전환 |

---

## 외부 서비스 (로컬 개발에서는 mock 으로 동작)

| 영역 | 운영 | 로컬 개발 |
|---|---|---|
| Database / Auth / Storage / Realtime | Supabase prod | Supabase dev |
| 본인 인증 | PASS / NICE | mock provider |
| SMS | NHN Toast | 콘솔 출력 mock |
| 얼굴 인증 | AWS Rekognition / Clova | mock (항상 verified) |
| 푸시 | Expo Push | 콘솔 출력 mock |

---

## 화면 ID 와 코드 매핑

기획 문서의 화면 ID(A01 ~ K05)와 기능 ID(FR-A01 ~ FR-J)를 코드에 명시적으로 노출.

- 모바일 화면 파일: `a03-login.tsx`, `b02-identity.tsx` 처럼 prefix 사용
- 백엔드 컨트롤러: JSDoc `@fr FR-XX` 로 매핑 명시
- 커밋 메시지: `feat(api): FR-B01 본인 인증 API 추가`

---

## 라이선스

내부 사용. 외부 공개 전 별도 결정.
