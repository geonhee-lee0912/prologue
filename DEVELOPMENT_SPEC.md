# 프롤로그 개발 스펙

갱신: 2026-10-30. 현재 코드와 확정된 목표를 구분한다. 이전 v0.2의 Railway·정기 추천·점수 6종·대화 만료·옛 FR 구현 순서는 폐기된 기준이다.

작업 규칙은 [AGENTS.md](AGENTS.md), 실행은 [README](README.md), 배포 결정은 [아키텍처 문서](09_아키텍처_의사결정_v0_2.md)와 [멀티 서비스 플랫폼 스펙](docs/superpowers/specs/2026-10-15-멀티서비스-플랫폼-design.md)을 따른다.

## 1. 설계 기준

- 사용자는 진열하지 않는다. 깊은 데이터는 AI만 보고, 허락한 조건 정보만 소개 편지에 담는다.
- 정기 추천·품질을 낮춘 억지 소개를 하지 않는다. 연결권은 양쪽의 대화 성립 시점에 차감한다.
- NestJS가 비즈니스 규칙·권한·외부 서비스를 담당한다. Supabase는 Postgres·RLS·Storage·Realtime을 맡는다.
- 공통 기능은 서비스별 데이터·키를 합치지 않고 `platform` 패키지로 공유한다. **현황 조사·현황표 작성 계획만 폐기됐으며 공통 플랫폼 계획은 유지한다.**
- 현재 구현이 정책을 만족하지 않는 부분은 [BACKLOG](BACKLOG.md)에 남긴다. 옛 코드의 존재를 새 제품 정책의 근거로 삼지 않는다.

## 2. 현재 기술 스택

정확한 버전은 각 `package.json`과 `pnpm-lock.yaml`이 기준이다.

| 영역           | 현재 코드                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| 언어·도구      | TypeScript, Node.js 20 이상, pnpm 9.12.0, Turbo                                                                    |
| 모바일         | Expo SDK 54, Expo Router 6, React 19.1, React Native 0.81, Zustand, TanStack Query, React Hook Form·Zod            |
| API            | NestJS 10, Prisma 5, Passport JWT, class-validator·class-transformer, Pino, Swagger, Throttler, `@nestjs/schedule` |
| 운영 도구      | Next.js 15 App Router, React 19.1, Tailwind, iron-session, NestJS Admin API                                        |
| DB·파일·실시간 | Supabase Postgres·Storage·Realtime, RLS SQL                                                                        |
| 테스트         | Vitest, API는 Nest testing·Supertest도 사용. 모바일 테스트는 `TZ=Asia/Seoul`                                       |

BullMQ·ioredis 의존성은 남아 있지만, 현재 갈피 예약 작업이 BullMQ로 실행되거나 임시 상태가 Redis에 저장된다는 뜻은 아니다.

## 3. 데이터 흐름과 권한

| 패턴                | 경로                                                          | 적용 기준                                                     |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| 1. 허용된 단순 조회 | 모바일 → Supabase                                             | RLS와 컬럼 공개 범위가 확인된 자기 데이터 등                  |
| 2. 비즈니스 처리    | 모바일·운영 도구 → NestJS → DB·외부 서비스                    | 인증·동의·다단계 트랜잭션·신고·차단·갈피 대화·서고·리포트     |
| 3. 실시간 수신      | Supabase Realtime → 모바일                                    | RLS가 허용한 변경만. 사람 대화 2단계에서 연결 예정            |
| 4. 백그라운드       | 현재 NestJS `@Cron`, 목표 Vercel Cron·`waitUntil`·Supabase 큐 | 먼저 말 걸기·수집·정리·재시도. 정기 추천 배급은 만들지 않는다 |

- 클라이언트는 `messages`, `matches`, `reports`, `blocks`에 직접 INSERT하지 않는다.
- 갈피 테이블은 클라이언트가 직접 읽거나 쓰지 않는다. API가 사용자·동의를 검사하고 공유 DTO로 필요한 정보만 반환한다.
- Prisma와 Supabase service role 접근은 RLS가 사용자별 권한을 대신 보장하지 않는다. API에서 차단 관계·소유권·상태를 검증한다.
- 메시지 전송은 NestJS 경유, 실시간 수신은 Realtime이라는 경계를 유지한다. 사람 대화 API·연결권 차감은 아직 구현되지 않았다.

## 4. 인증과 API 규약

### 사용자·운영자 인증

현재 사용자 JWT는 **API의 `JwtIssuerService`가 `SUPABASE_JWT_SECRET`으로 발급**하는 Supabase 호환 HS256 토큰이다. `sub`, `role=authenticated`, `aud=authenticated`, `iss=prologue`를 담고 15분 유효하다. refresh token은 30일, DB에는 SHA-256 해시만 저장하며 회전한다. `SupabaseJwtStrategy`가 Bearer 토큰을 검증한다. “Supabase Auth가 발급하고 API는 검증만 한다”는 옛 설명은 현재 코드와 다르다.

운영자는 `AdminAuthService`의 이메일·bcrypt 비밀번호 검증과 `ADMIN_JWT_SECRET`으로 서명한 별도 JWT(8시간)를 쓴다. Next.js 쪽은 iron-session을 사용한다. 역할 강제·세션 비밀값 기본값 등 남은 점검은 BACKLOG 9절을 따른다. Realtime이 사용자 토큰을 신뢰하도록 맞추는 일은 2단계 전 확인한다.

### 경로·응답

- 전역 prefix: `/api`. 사용자 컨트롤러는 `/api/v1/...`, 관리자 API는 `/api/v1/admin/...`. 예외는 컨트롤러를 확인한다.
- 상태 확인: `/api/health`, Swagger: `/api/docs`.
- 성공: `{ "data": <T> }`. 실패: `{ "error": { "code": "...", "message": "...", "details"?: ... } }`.
- 새 비즈니스 오류는 `AppException`과 `packages/shared/src/errors.ts`의 `ErrorCode`를 사용한다.
- 응답은 명시적 DTO로 만든다. Prisma/Supabase 결과 전체를 그대로 반환하지 않는다. 화면용 모델은 서버 응답 계약과 구분한다.
- 반복 요청·예약 작업은 멱등성을 보장한다. 갈피 구현의 조건부 갱신·트랜잭션은 실행 중 결정 기록을 확인한다.

## 5. 갈피·화면·정책

갈피 1단계 구현은 `apps/api/src/galpi/`, 설계는 [AI 엔진 스펙](docs/superpowers/specs/2026-10-11-갈피-AI-엔진-design.md), 세부 선택은 [실행 중 결정](docs/superpowers/plans/2026-10-11-갈피-AI-엔진-1단계-결정.md)을 본다. 2026-09의 AI 인터뷰 계획을 새 실행 순서로 쓰지 않는다.

- 정책 값: `packages/shared/src/policy.ts`. 점수 6개·가중치·대화 7/14/21일 만료는 폐기됐다.
- 갈피 서버 계약: `packages/shared/src/galpi/contract.ts`. UI 도메인 모델과 다른 사용자에게 보낼 데이터는 `apps/mobile/domain/types.ts` 상단 계약을 확인한다.
- 현행 라우트는 뜻이 보이는 이름, 화면 ID A1~G5는 `@screen` 주석으로 추적한다. 옛 FR-\*·A01~K05는 남아 있는 코드의 이력이다.
- 모바일은 mock store·시나리오 기반이다. API 엔진 구현 완료와 모바일 연결 완료를 구분한다.

## 6. DB·RLS 변경

| 자산                    | 현재 위치·도구                                               |
| ----------------------- | ------------------------------------------------------------ |
| 스키마                  | `apps/api/prisma/schema.prisma`                              |
| 테이블·enum·인덱스 변경 | `apps/api/prisma/migrations/*/migration.sql`, Prisma Migrate |
| RLS·정책 부속 SQL       | `supabase/policies/*.sql`                                    |
| RLS 적용                | 루트 `pnpm db:rls` → `supabase/apply-policies.js` → psql     |

변경 SQL은 원격 DB 없이 `prisma migrate diff`로 만든다. 새 테이블은 RLS와 정책 검사를 함께 추가한다. **원격 적용은 사람 확인 후** Prisma 마이그레이션 → 정책 순서로 진행한다. 현재 `supabase db push`로 정책 디렉터리가 적용되지 않는다. 정확한 명령은 [supabase/README](supabase/README.md)를 따른다.

미리보기 브랜치를 위해 `supabase/migrations`로 스키마·RLS를 통합하고 Prisma는 클라이언트·SQL 생성에만 쓴다는 결정은 **아직 미적용**이다. 현재 경로와 미래 경로를 섞어 안내하지 않는다.

## 7. 개인정보·외부 서비스

- 전화번호는 SHA-256 + pepper로 `User.phoneHash`만 저장한다. 이름·생년월일 등 본인인증 원본은 검증 뒤 폐기한다.
- 얼굴 인증 이미지는 보안 버킷에 두고 24시간 이내 폐기해야 한다. 실패 이미지의 TTL 작업은 아직 없다(BACKLOG 7절).
- 상대 식별자·연락처·거절 사유·점수·신고 내용·운영 메모를 사용자 응답에 싣지 않는다. 연락처의 허용 조건은 AGENTS 10.1을 따른다.
- 로그에 전화번호·이메일·인증 원본·메시지 본문을 쓰지 않는다. 오류 응답·예외 로그에 데이터가 섞이는 기존 문제는 BACKLOG 9절에 있다.
- 실제 LLM 전에 필수·민감정보·국외이전 동의를 분리하고, API 전송 전 가명처리, 저장 시 민감정보 마스킹, 무보존·미학습 설정과 처리방침을 확인한다(AGENTS 10.2b·10.2c).
- 자동화된 결정의 설명·거부 요청 창구를 둔다. 운영자의 상시 주선 검수는 두지 않는다.
- 외부 서비스는 `packages/shared/src/integrations/` 인터페이스를 거친다. Storage는 Supabase SDK를 직접 쓴다.
- 현재 `InfraModule`은 LLM 이외의 외부 서비스를 mock으로 고정한다. LLM은 `mock|openai`, 카카오는 `mock|real` 선택 코드가 있다. 새 provider는 실/mock 전환과 운영 mock 금지를 함께 만든다.
- 본인인증 목표는 포트원 V2, 앱 결제는 인앱결제·웹은 토스다. 업체 계약·실 연동은 아직이다. 얼굴 인증을 새 온보딩에 둘지는 미정이다.

## 8. 실행·검증·PR

클라우드에서 저장소·설치된 도구와 개발용 환경변수만으로 실행한다. 데스크톱 메모리·회사 노트북 SSH 설정·특정 플러그인을 필수 조건으로 삼지 않는다. `.env` 없이 가능한 검증과 mock 미리보기는 README를 따른다.

shared를 먼저 빌드하고 변경 영역의 타입 검사·Vitest를 실행한다. 보안·권한 변경은 회귀 테스트, RLS는 정책 검사와 실제 접근 검증이 필요하다. 현재 RLS 테스트가 파일 검사 위주라는 한계는 BACKLOG 1·9절에 남긴다. API dev 실행은 원격 DB·예약 작업에 연결하므로 DB 적용 상태를 확인한다.

작업은 개별 브랜치와 PR로 남긴다. PR 생성 요청에는 해당 브랜치 게시가 포함된다. 운영자가 병합하며 자동 병합을 켜지 않는다. DB·호스팅 콘솔 변경은 별도 승인 후 한다.

## 9. 배포 목표와 미완료 전환

| 역할                    | 확정된 목표                              | 남은 일                                               |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------- |
| API·운영 도구           | Vercel                                   | API 진입점·배포 설정 검증                             |
| 예약 작업               | Vercel Cron의 내부 엔드포인트            | 인증·중복 실행 방어·NestJS `@Cron` 전환               |
| 응답 뒤 작업            | `waitUntil`                              | 첫 리포트·수집 등 프로세스 내 작업 전환               |
| 재시도                  | Supabase 큐(pgmq) 또는 발송 대기표       | 작업 분할·재시도·중복 방지                            |
| OTP·인증 세션·요청 제한 | Upstash Redis                            | 메모리 저장소 전환, 프록시 뒤 tracker 확인            |
| DB·환경                 | Supabase의 서비스 단계별 dev·PR 미리보기 | 스키마·RLS 마이그레이션 통합과 환경 연결              |
| 모바일                  | Expo EAS                                 | development/운영 빌드·카카오 OAuth·푸시·인앱결제 연결 |

Railway와 BullMQ 상시 워커는 목표에서 제외됐다. 상시 서버가 필요한 예외는 플랫폼 스펙 7장을 따른다. Vercel·Supabase 요금은 기존 Pro 팀·조직과 사용량을 기준으로 플랫폼 스펙 15장에서 관리하며, 옛 Railway 포함 월 $30~35 추산은 사용하지 않는다.

## 10. 다음 작업과 변경 이력

공통 플랫폼 순서는 플랫폼 스펙 14장, 프롤로그의 남은 작업은 BACKLOG를 따른다. 현황 조사·현황표 작성이나 조사 승인 단계를 다시 넣지 않는다. 공통 플랫폼 자체를 폐기하거나 새로운 제품 개발 순서를 정한 것으로 해석하지 않는다.

- 2026-10-30: 현재 코드와 2026-10 플랫폼 결정에 맞춰 정리. 인증·응답·마이그레이션·RLS·화면·외부 서비스 설명을 갱신하고, 현재 구현/미적용 목표를 구분했다.
- 2026-05-10: v0.1·v0.2 작성. 당시 NestJS + Supabase 하이브리드를 채택했다. 이후 대체된 내용은 Git 이력에서 확인한다.
