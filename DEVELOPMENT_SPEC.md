# 프롤로그 개발 스펙 v0.2

문서 상태: Confirmed
작성 기준: 09_아키텍처 의사결정 v0.2, 프롤로그 서비스 콘셉트 기획서 v1.1, 08_MVP 기능범위 정의서 v0.1, 08_기능요구사항서 v0.1, 08_화면목록_IA v0.1, 08_데이터항목 정의서 v0.1, 08_추천 알고리즘 기준서 v0.1
문서 목적: 프롤로그 MVP 를 클로드 코드로 개발하기 위한 기술 스택, 아키텍처, 의사결정 기준을 정의한다.

> v0.2 변경 요점: 아키텍처 B안 (NestJS + Supabase 하이브리드) 채택. PostgreSQL/Storage/Auth/Realtime 을 Supabase 로 위임. 자체 인프라 (Docker Compose, S3, MinIO, socket.io) 제거.

---

## 1. 문서 목적

이 문서는 프롤로그 MVP 의 기술 의사결정을 한 곳에 모은다. 기획 문서가 "무엇을 만들지"를 정의했다면, 이 문서는 "어떻게 만들지"를 정의한다.

이 문서가 다루는 범위:

1. 기술 스택 선택과 그 이유
2. 모노레포 구조와 패키지 분리 기준
3. Supabase 와 NestJS 의 책임 분담
4. 외부 서비스 의존성과 추상화 방식
5. 데이터 모델과 RLS 정책 매핑
6. 보안/개인정보 처리 원칙의 기술적 적용
7. 개발 워크플로우와 환경
8. 배포와 운영 기본 방향

---

## 2. 의사결정 원칙

이 문서의 모든 기술 선택은 다음 원칙을 따른다.

1. **MVP 검증이 최우선이다.**
2. **국내 규제와 사용자 환경에 맞춘다.** Supabase 서울 리전 사용.
3. **소수 인원이 운영 가능해야 한다.** 한 명 또는 두 명의 개발자가 클로드 코드와 함께 운영.
4. **외부 서비스는 갈아끼울 수 있게 한다.** 본인인증, SMS, 푸시는 인터페이스 뒤로 숨긴다.
5. **민감 정보는 처음부터 격리한다.** Supabase RLS 와 NestJS 응답 직렬화로 이중 방어.
6. **추천은 룰 기반에서 시작한다.** ML 인프라보다 SQL 점수 계산 우선.
7. **Supabase 가 기본, NestJS 가 비즈니스 로직.** Supabase 로 충분한 단순 조회는 모바일 직접 호출, 트랜잭션과 외부 연동은 NestJS 경유.

---

## 3. 기술 스택 결정

### 3.1 언어

전 영역에서 **TypeScript**.

### 3.2 모바일 앱 (사용자 앱)

**Expo (React Native) + TypeScript**

| 항목 | 선택 |
|---|---|
| 프레임워크 | Expo SDK 51+ |
| 라우팅 | Expo Router (file-based) |
| 상태 관리 | Zustand + TanStack Query |
| 폼 | React Hook Form + Zod |
| Supabase 클라이언트 | @supabase/supabase-js (실시간, 직접 조회) |
| 푸시 | expo-notifications |
| 카메라/얼굴 | expo-camera |
| 보안 저장소 | expo-secure-store (Supabase 토큰) |

### 3.3 백엔드 API

**NestJS + Prisma + Supabase Postgres**

| 항목 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | NestJS 10+ | |
| ORM | Prisma | Supabase Postgres 연결 |
| DB | Supabase Postgres (서울 리전) | dev / prod 두 프로젝트 |
| 호스팅 | Railway Hobby | $5~10/월 예상 |
| 캐시/큐 | Upstash Redis + BullMQ | 무료 티어로 시작 |
| 실시간 (서버 측 보조만) | NestJS는 직접 WebSocket 안 함 | Supabase Realtime 이 broadcast |
| Storage 접근 | @supabase/supabase-js (service role) | NestJS 가 사진 검수 시 사용 |
| 인증 | Supabase JWT 검증 | 자체 발급 안 함 |
| 검증 | class-validator + class-transformer | |
| 로깅 | Pino | |
| API 문서 | Swagger | `/api/docs` |

### 3.4 관리자 도구 (운영자용)

**Next.js 14 (App Router) + TypeScript**

| 항목 | 선택 |
|---|---|
| 프레임워크 | Next.js 14 App Router |
| UI | shadcn/ui + Tailwind |
| 데이터 | NestJS Admin API (`/api/admin/v1`) 호출 |
| 인증 | Supabase Auth + 운영자 권한 검증 |
| 호스팅 | Vercel Hobby |

### 3.5 인프라 / DevOps

| 항목 | 선택 |
|---|---|
| Database / Auth / Storage / Realtime | Supabase (서울 리전, dev + prod 두 프로젝트) |
| 백엔드 호스팅 | Railway Hobby |
| Redis | Upstash 무료 티어 |
| 모바일 빌드 | Expo EAS |
| 관리자 호스팅 | Vercel Hobby |
| 도메인/CDN | Cloudflare (선택) |
| 모니터링 | Sentry (선택, MVP 후순위 가능) |
| CI/CD | GitHub Actions |

---

## 4. Supabase vs NestJS 책임 분담

이 절이 B안의 핵심이다. 어떤 작업을 어디서 하는지 명확히 해야 코드가 흩어지지 않는다.

### 4.1 4가지 데이터 흐름 패턴

#### 패턴 1: 단순 조회 — 모바일이 Supabase 직접

```ts
// apps/mobile 에서
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

해당 작업: 내 프로필, 매칭된 대화방 목록, 받은 추천 카드 목록, 알림 목록.

RLS 가 권한 검증을 담당한다.

#### 패턴 2: 비즈니스 트랜잭션 — NestJS 경유

```ts
// apps/mobile 에서
await api.post('/interests', { targetUserId });

// apps/api 에서
async sendInterest(userId, targetUserId) {
  // 1. 차단/제재/자기 자신 검증
  // 2. UserAction INSERT
  // 3. 상호 관심이면 Match INSERT + Conversation INSERT
  // 4. 첫 대화 주제 시스템 메시지 INSERT (Realtime 자동 broadcast)
  // 5. 양쪽 푸시 알림 발송
}
```

해당 작업: 관심 보내기, 매칭 생성, 메시지 전송, 신고, 차단, 연락처 교환 동의, 대화 연장.

NestJS 가 service role key 로 Supabase 에 쓴다 (RLS 우회).

#### 패턴 3: 실시간 구독 — 모바일이 Supabase Realtime 직접

```ts
// apps/mobile 에서
supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}` },
      (payload) => addMessage(payload.new)
  )
  .subscribe();
```

해당 작업: 대화방 새 메시지 수신, 매칭 도착 알림, 추천 카드 도착 알림.

RLS 가 본인이 참여한 대화/매칭/추천만 구독 허용.

#### 패턴 4: 백그라운드 작업 — NestJS Cron + BullMQ

```ts
@Cron('0 6 * * *')
async generateDailyRecommendations() {
  // 1. 모든 active 사용자 조회
  // 2. 각 사용자별 추천 후보 큐에 enqueue
  // 3. 워커가 큐에서 꺼내 점수 계산 → Recommendation INSERT
}
```

해당 작업: 추천 배치, 대화 만료 처리, 24시간 전 안내, 오래된 OTP/얼굴 인증 이미지 정리, 푸시 발송.

### 4.2 결정 흐름표

새 기능을 만들 때 어떤 패턴을 쓸지 결정하는 흐름.

```
이 작업이 …

1. 단순 조회인가?
   ├ 그렇다 → 패턴 1 (모바일 직접)
   └ 아니다 → 2번으로

2. 다른 사용자의 데이터를 변경하거나, 외부 서비스 호출이 필요한가?
   ├ 그렇다 → 패턴 2 (NestJS API)
   └ 아니다 → 3번으로

3. 실시간 데이터 수신이 필요한가?
   ├ 그렇다 → 패턴 3 (Supabase Realtime 구독)
   └ 아니다 → 패턴 4 (NestJS 백그라운드)
```

### 4.3 절대 위반 금지 규칙

- 모바일이 `recommendations.total_score` 같은 점수 컬럼을 SELECT 하지 않는다 (RLS 로 컬럼 가림).
- 모바일이 `user_actions.skip_reason` 을 SELECT 하지 않는다 (자신 것이라도).
- 모바일이 `messages` 에 직접 INSERT 하지 않는다 (검증 우회 방지). 항상 NestJS 경유.
- 모바일이 `matches`, `reports`, `blocks` 에 직접 INSERT 하지 않는다.
- NestJS 는 모바일에 Supabase service role key 를 노출하지 않는다.

---

## 5. 외부 서비스 의존성

기능 ID 기준으로 의존하는 외부 서비스.

| 영역 | 기능 ID | 후보 | MVP 선택 | 추상화 인터페이스 |
|---|---|---|---|---|
| 본인 인증 | FR-B01 | PASS, NICE | 계약 후 결정 | `IdentityVerificationProvider` |
| SMS OTP | FR-A01 | NHN Toast, Aligo | NHN Toast | `SmsProvider` |
| 얼굴 인증 | FR-B02 | AWS Rekognition, NAVER Clova | 계약 후 결정 | `FaceVerificationProvider` |
| 사진 검수 | FR-C02 | AWS Rekognition Moderation | + 운영자 검수 | `PhotoModerationProvider` |
| 푸시 | FR-F01, FR-G01 | Expo Push | Expo Push | `PushProvider` |
| 결제 | FR-I01, FR-I02 | 토스, 아임포트, App Store/Play | MVP 후순위 | `PaymentProvider` |
| 객체 스토리지 | 사진 | Supabase Storage | Supabase Storage | (인터페이스 없이 직접 사용) |
| 인증 JWT | 모든 | Supabase Auth | Supabase Auth | NestJS 가 검증만 |

`packages/shared/integrations/` 에 인터페이스 정의, `apps/api/src/infra/` 에 구현체. 테스트와 로컬 개발은 `MockProvider`.

---

## 6. 모노레포 구조

pnpm workspaces + Turborepo.

```
prologue/
├─ apps/
│  ├─ api/              # NestJS 백엔드 (Railway)
│  │  └─ prisma/        # 스키마와 마이그레이션
│  ├─ mobile/           # Expo 사용자 앱
│  └─ admin/            # Next.js 운영자 도구 (Vercel)
├─ packages/
│  └─ shared/           # 타입, enum, 정책 상수, 외부 서비스 인터페이스
├─ supabase/
│  ├─ migrations/       # Prisma 가 만든 SQL (테이블, 인덱스, 외래키)
│  ├─ policies/         # RLS 정책 SQL (사람이 작성)
│  ├─ functions/        # DB 함수 / 트리거 SQL
│  └─ seed.sql          # 개발용 시드 데이터
├─ docs/                # 기획 문서 사본
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
├─ tsconfig.base.json
├─ CLAUDE.md            # 클로드 코드 작업 지침
├─ DEVELOPMENT_SPEC.md  # 이 문서
├─ 09_아키텍처_의사결정_v0_2.md
└─ NEXT_STEPS.md
```

**Docker Compose 와 MinIO 는 사용하지 않는다.** Supabase 가 모두 대체.

---

## 7. 데이터 모델과 마이그레이션

### 7.1 Prisma 와 Supabase CLI 의 책임 분담

| 도구 | 담당 | 작업 흐름 |
|---|---|---|
| Prisma | 테이블, 컬럼, 인덱스, 외래키, enum | `schema.prisma` 수정 → `prisma migrate dev` → SQL 자동 생성 |
| Supabase CLI | RLS 정책, DB 함수, 트리거, Realtime 설정 | `supabase/policies/*.sql` 작성 → `supabase db push` |

**한 가지 운영 규칙: Supabase Studio 에서 스키마를 직접 변경하지 않는다.** 모든 변경은 코드 저장소 → 마이그레이션 적용 흐름.

### 7.2 데이터 모델 매핑 원칙

`08_데이터항목 정의서 v0.1` 의 엔티티를 Prisma 스키마로 옮기는 원칙은 v0.1 과 동일. (모델 이름, enum, ID, 공통 필드, 민감 정보 분리)

추가로 RLS 관련:

- 자신만 볼 수 있는 데이터: `auth.uid() = user_id` 정책
- 매칭/추천 관계가 있는 상대만 볼 수 있는 데이터: 관계 테이블 조회 정책
- 점수 컬럼: 컬럼 단위 정책 (`column-level RLS`)
- 운영자 데이터: 별도 스키마 또는 `is_admin()` 함수 사용

### 7.3 마이그레이션 작업 순서

```
1. apps/api/prisma/schema.prisma 수정
2. pnpm --filter api prisma migrate dev --name <name>
   → prisma/migrations/<timestamp>_<name>/migration.sql 생성
3. 생성된 SQL 검토 후 supabase/migrations/ 로 복사 (또는 심볼릭 링크)
4. 새 RLS 가 필요하면 supabase/policies/<table>.sql 추가/수정
5. supabase db push (dev 프로젝트에 적용)
6. 모바일/관리자/백엔드 영향받는 코드 수정
7. dev 에서 검증 후 prod 에 동일한 흐름 적용
```

### 7.4 RLS 정책 파일 구조

```
supabase/policies/
├─ profiles.sql
├─ photos.sql
├─ messages.sql
├─ recommendations.sql
├─ matches.sql
├─ conversations.sql
├─ user_actions.sql
├─ reports.sql
├─ blocks.sql
├─ contact_exchanges.sql
└─ admin.sql
```

각 파일은 해당 테이블의 모든 정책 (SELECT/INSERT/UPDATE/DELETE) 을 담는다. 정책 변경 이력을 git 으로 추적한다.

---

## 8. API 설계 규칙

### 8.1 경로

- 사용자용: `/api/v1/...`
- 관리자용: `/api/admin/v1/...`
- 헬스체크: `/api/health`

### 8.2 인증/인가

JWT 는 Supabase 가 발급한다. NestJS 는 Supabase JWT secret 으로 검증만 한다.

```ts
// apps/api/src/auth/supabase-jwt.strategy.ts
new JwtStrategy({
  secretOrKey: process.env.SUPABASE_JWT_SECRET,
  algorithms: ['HS256'],
  // ...
});
```

토큰 페이로드 (Supabase 표준):
- `sub`: Supabase user id
- `email`, `phone`
- `role`: `authenticated` 또는 `service_role`
- `app_metadata`: 우리가 추가한 정보 (membership_type, identity_verified 등)

운영자 토큰은 별도 (`role = 'admin'` 같은 커스텀 클레임).

### 8.3 응답 규약

```ts
// 성공
{ "data": <T>, "meta"?: { ... } }

// 실패
{ "error": { "code": "STRING_CODE", "message": "...", "details"?: {...} } }
```

에러 코드는 `packages/shared/errors.ts` 에 모은다.

### 8.4 페이지네이션

cursor-based 기본.

### 8.5 멱등성

POST `/matches`, `/interests`, `/reports`, `/messages` 는 `Idempotency-Key` 헤더 지원.

---

## 9. 보안과 개인정보의 기술적 적용

`prologue_04_privacy_visibility_policy_v0.1` 정책의 기술 측면 보장.

### 9.1 휴대폰 번호

- Supabase Auth 의 phone provider 는 사용하지 않는다 (한국 SMS 업체 미지원).
- 자체 OTP 흐름:
  1. 모바일 → NestJS `/auth/otp/send`
  2. NestJS → NHN Toast SMS API
  3. NestJS → Upstash Redis (3분 TTL, 해시값 저장)
  4. 모바일 → NestJS `/auth/otp/verify`
  5. 검증 성공 → Supabase Admin SDK 로 사용자 생성/조회
  6. Supabase Auth Admin API 로 세션 발급 → JWT 반환
- 휴대폰 번호 평문은 OTP 검증 동안만 메모리 보관. 이후 SHA-256(pepper) 으로 해시해 `User.phoneHash` 저장.

### 9.2 본인 인증 원본

- PASS/NICE 응답의 CI 만 해시 저장. 이름, 생년월일은 검증에만 사용 후 폐기.
- 인증 완료 시점, 동의 버전, 업체 식별자만 `UserAuth` 에 보관.

### 9.3 얼굴 인증 이미지

- Supabase Storage 의 별도 보안 버킷 (`face-auth`).
- RLS 정책으로 운영자도 직접 SELECT 불가. 검수 시 짧은 TTL 서명 URL 발급.
- 24시간 후 자동 삭제 (NestJS Cron + Supabase Storage Admin API).
- 매칭 결과 (matched/not_matched, confidence) 만 `UserAuth.faceMatchStatus` 에 저장.

### 9.4 거절 사유, 신고 내용

- `user_actions.skip_reason` 은 컬럼 단위 RLS 로 자신도 SELECT 불가하게 막을 수 있다 (또는 별도 테이블 분리 검토).
- `reports.description` 은 운영자만 SELECT.
- NestJS 응답 직렬화에서도 이중 차단.

### 9.5 연락처 교환

- 상호 동의 전까지 어떤 응답에도 평문 포함 안 함.
- 동의 시점에 양쪽 사용자가 자기 연락처를 새로 입력. 저장된 User 데이터로 자동 노출 안 함.
- 교환 완료 시 시스템 메시지로 한 번 노출, `ContactExchange` 에는 마스킹 형태로만 보관.

### 9.6 메시지

- soft delete 만 허용. 신고 검토 보존.
- 정책서 확정 후 일정 기간 뒤 cron 으로 영구 삭제.

### 9.7 일반 보안

- Supabase service role key 는 NestJS 환경 변수로만 보관, 코드/모바일/Vercel 클라이언트에 절대 노출 금지.
- 모바일은 anon key 만 사용 (RLS 가 권한 강제).
- 운영 DB 접근은 Supabase 의 IAM/네트워크 제한 활용.

---

## 10. 추천 시스템의 기술적 형태 (MVP)

### 10.1 데이터 흐름

```
[사용자/프로필/인증/관계 목적/액션]
        ↓
[추천 후보 필터: SQL view]
        ↓
[점수 계산: NestJS 서비스 메서드]
        ↓
[Recommendation INSERT]
        ↓
[추천 이유 생성: 룰 기반 템플릿]
        ↓
[모바일이 Supabase 에서 자기 것만 SELECT (RLS)]
[모바일이 패턴 3로 새 추천 도착 알림 구독 가능]
```

### 10.2 배치 vs 온디맨드

- **배치**: 매일 새벽 NestJS @Cron + BullMQ. 일자별 추천 미리 생성.
- **온디맨드**: 빈 상태 사용자에게 fallback. 최대 1회/일.

### 10.3 점수 계산 위치

- MVP 는 NestJS 서비스 메서드. 디버깅 용이.
- 후보 풀이 커지면 SQL CTE 또는 materialized view 로 옮긴다.

### 10.4 추천 이유 텍스트

- 점수 → 텍스트 매핑을 `packages/shared/recommendation-reasons.ts` 에 둔다.
- 모든 텍스트는 `08_추천 알고리즘 기준서` 의 권장/금지 표현 규칙 준수.
- 운명/완벽/보장 같은 금지 표현은 정적 분석으로 차단.

---

## 11. 화면 ID 와 코드 매핑

(v0.1 과 동일)

### 11.1 모바일 (Expo Router)

화면 ID 가 파일명 prefix 로 노출.

```
apps/mobile/app/
├─ (auth)/a01-splash.tsx, a02-onboarding.tsx, a03-login.tsx, a04-consent.tsx
├─ (verification)/b01-intro.tsx ~ b07-single-pledge.tsx
├─ (profile-setup)/c01-start.tsx ~ c08-completeness.tsx
├─ (tabs)/home.tsx (D01), interests.tsx (E04), chats.tsx (G01), me.tsx (J01)
├─ recommendation/[id]/card.tsx (D02), profile.tsx (D03), report.tsx (D04, D05)
├─ chat/[id].tsx (G02)
└─ ...
```

### 11.2 관리자 (Next.js)

```
apps/admin/app/
├─ login/page.tsx              # K01
├─ users/page.tsx              # K02
├─ reviews/page.tsx            # K03
├─ reports/page.tsx            # K04
└─ recommendations/page.tsx    # K05
```

---

## 12. 환경 변수와 시크릿

`.env.example` 에 모든 키 기록, 실제 값은 Railway/Vercel/Supabase 의 환경 변수 UI로 관리.

| 카테고리 | 예시 키 | 비고 |
|---|---|---|
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` | dev/prod 다른 값 |
| DB | `DATABASE_URL` | Supabase Postgres 연결 (Prisma 용) |
| Redis | `REDIS_URL` | Upstash |
| 본인 인증 | `IDENTITY_VERIFICATION_PROVIDER`, `PASS_*` 또는 `NICE_*` | |
| SMS | `SMS_PROVIDER`, `NHN_TOAST_*` | |
| 푸시 | `EXPO_ACCESS_TOKEN` | |
| 보안 | `PHONE_HASH_PEPPER` | 64자 이상 랜덤 |
| 모니터링 | `SENTRY_DSN` | 선택 |

---

## 13. 개발 환경 요구사항

| 항목 | 버전 |
|---|---|
| Node.js | 20 LTS 이상 |
| pnpm | 9 이상 |
| Supabase CLI | 최신 (`brew install supabase/tap/supabase` 또는 `npm i -g supabase`) |
| iOS 시뮬레이터 | Xcode 15+ (macOS만) |
| Android 에뮬레이터 | Android Studio Hedgehog+ |
| Expo Go (실기기 테스트용) | 최신 |

**Docker 는 필요하지 않다.** Supabase Cloud 두 프로젝트로 dev/prod 분리.

---

## 14. 개발 워크플로우

### 14.1 환경 분리

| 환경 | Supabase 프로젝트 | 백엔드 | 운영자 도구 |
|---|---|---|---|
| 로컬 개발 | dev | localhost:3001 (NestJS) | localhost:3002 (Next.js) |
| Staging | dev (또는 별도 staging 프로젝트) | Railway staging | Vercel preview |
| Production | prod | Railway production | Vercel production |

MVP 초기에는 dev = staging 으로 시작. 베타 직전에 분리 검토.

### 14.2 브랜치 전략

(v0.1 과 동일)

- `main`: 운영
- `develop`: 통합 개발
- `feat/<feature-id>-<desc>`: 기능
- `fix/<desc>`: 버그
- `chore/<desc>`: 그 외

### 14.3 커밋 메시지

(v0.1 과 동일) Conventional Commits + FR ID.

### 14.4 PR 체크리스트

- 관련 기획 문서 ID 명시
- 테스트 추가/갱신
- 데이터 모델 변경 시 Prisma 마이그레이션 + RLS 정책 모두 포함
- 모바일이 추가된 테이블/컬럼에 직접 접근하는지 확인 → 필요 시 RLS 정책 작성
- 개인정보가 로깅에 포함되지 않는지 확인
- 카피가 톤 가이드의 권장/금지 표현을 위반하지 않는지 확인

### 14.5 클로드 코드 활용 패턴

- 새 기능 시작: 관련 FR ID, 화면 ID, 데이터 흐름 패턴(1~4) 명시
- 데이터 변경: schema.prisma 수정 → 마이그레이션 → RLS 정책 → 영향받는 DTO/서비스/UI 까지 전수 검사
- 카피: `prologue_02_copy_tone_guide` 의 톤 규칙 함께 전달
- 정적 분석: 매 PR 에 금지 표현 검사

---

## 15. 테스트 전략 (MVP)

| 레벨 | 도구 | 적용 범위 |
|---|---|---|
| 단위 | Vitest | 추천 점수, 거절 사유 가중치, 카피 생성기 |
| API 통합 | Vitest + Supertest | FR 단위 (가입, 인증, 추천, 매칭, 메시지, 신고) |
| RLS 정책 | pgTAP 또는 SQL 테스트 | 정책별 SELECT/INSERT 권한 검증 |
| E2E (모바일) | Maestro | 핵심 플로우 |

**RLS 정책 테스트는 필수.** 정책 실수가 개인정보 노출로 이어지므로 회귀 테스트로 보호.

---

## 16. 배포

### 16.1 모바일

Expo EAS → TestFlight (iOS) / Play Console 내부 테스트 → 베타 → 정식 출시.

OTA 채널: `staging`, `production`.

### 16.2 백엔드 (Railway)

- GitHub Actions:
  1. PR: lint + test
  2. develop merge: Railway staging 자동 배포
  3. main merge: Railway production 자동 배포 (수동 승인)

### 16.3 관리자 (Vercel)

GitHub 연결 → push 시 자동 배포. Preview deployments 활용.

### 16.4 데이터베이스 마이그레이션

- Prisma Migrate: `pnpm --filter api prisma migrate deploy`
- Supabase CLI: `supabase db push --linked`
- 운영 적용 전 dev 에서 항상 검증.
- 백업: Supabase 의 자동 백업 활용 (Pro 플랜은 PITR 지원).

---

## 17. 비용 (베타 1만 MAU 기준)

| 항목 | 월 비용 |
|---|---:|
| Supabase Pro (운영) | $25 |
| Supabase Free (개발) | $0 |
| Railway Hobby (NestJS) | $5~10 |
| Upstash Redis (무료) | $0 |
| Vercel Hobby (운영자) | $0 |
| **합계** | **$30~35** |

별도: 도메인, Apple/Google 개발자 계정, Sentry, 본인인증/SMS 사용량.

---

## 18. 미결정 사항

1. 본인 인증 업체 (PASS vs NICE)
2. 얼굴 인증 업체 (AWS Rekognition vs NAVER Clova)
3. 사진 검수 자동화 수준
4. 결제 수단 (앱스토어 IAP vs 웹결제)
5. 얼굴 인증 라이브니스 도입 여부
6. NativeWind 도입 여부
7. dev 와 staging 분리 시점
8. RLS 정책 테스트 도구 (pgTAP vs SQL 테스트 vs 통합 테스트)

---

## 19. 다음 작업

1. Supabase Cloud 에 dev / prod 두 프로젝트 생성 (서울 리전)
2. `apps/api/prisma/schema.prisma` 를 dev Supabase 에 적용
3. `supabase/policies/` 의 RLS 정책 작성
4. NestJS 부트스트랩 + Supabase JWT 검증 설정
5. 외부 서비스 인터페이스 + mock 구현체
6. 기능요구사항서 P1 기능 구현 시작

---

## 20. 변경 이력

- 2026-05-10: v0.1 최초 작성. NestJS + 자체 AWS 인프라 기준.
- 2026-05-10: v0.2 갱신. 09_아키텍처 의사결정 v0.2 의 결정 반영. B안 (NestJS + Supabase 하이브리드) 채택. PostgreSQL/Storage/Auth/Realtime → Supabase. 호스팅 → Railway + Vercel + Upstash. Docker Compose 와 MinIO 제거. 4가지 데이터 흐름 패턴, RLS 작업 흐름, Prisma + Supabase CLI 병행 마이그레이션 절차 추가.
