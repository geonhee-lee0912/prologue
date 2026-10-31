# 프롤로그 (Prologue)

> **진열되지 않는 소개팅.** AI와 대화하며 나를 알아가고, 좋은 상대가 나타났을 때 소개를 받는다.

작업 지침과 하드룰은 [AGENTS.md](AGENTS.md), 제품의 출발점은 [컨셉 재설정](docs/superpowers/specs/2026-09-02-컨셉-재설정-design.md)이다. 이후 결정은 날짜와 변경 이력을 함께 확인한다.

## 현재 상태 (2026-10-30 문서 정리 기준)

| 영역               | 구현과 남은 일                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 모바일             | Expo SDK 54·React Native 0.81. 4탭(친구/대화/내 이야기/설정), 갈피 대화방·갈피의 방, 편지·가벼운 소개·사람 대화방이 **mock 데이터**로 동작한다. 로그인·동의·본인인증 진입 흐름과 갈피 API 연결은 남아 있다 |
| 갈피 AI 엔진 1단계 | 대화·버튼 답·서고 수집·가명처리·위기 감지·첫 리포트·먼저 말 걸기 구현. LLM은 mock/OpenAI 전환과 운영 mock 차단이 있다. 원격 DB 적용·모바일 연결·실제 LLM 평가는 미완료다                                   |
| API 기반           | NestJS 10·Prisma 5, JWT 발급·검증, 인증·계정·사진·신고·차단, 응답 규약·PII 마스킹 로거. 옛 온보딩·프로필·연락처 API 일부는 재설계 대상이다                                                                 |
| 운영자 도구        | Next.js 15. 로그인, 사용자·사진·재직 검수, 신고 처리. 출시 전 권한·세션 점검이 남아 있다                                                                                                                   |
| DB·RLS             | Prisma 마이그레이션과 `supabase/policies/` SQL을 관리한다. 정책 파일 정리는 끝났지만 dev DB 적용과 실제 역할별 접근 검증은 남아 있다                                                                       |
| 호스팅·공통 플랫폼 | **Vercel + Supabase로 결정**, 이전과 공통 패키지 연결은 아직이다. 현재 API는 `app.listen()`·NestJS `@Cron`으로 실행한다                                                                                    |

갈피 엔진 구현 계획은 [1단계 계획](docs/superpowers/plans/2026-10-11-갈피-AI-엔진-1단계.md), 구현 중 결정은 [결정 기록](docs/superpowers/plans/2026-10-11-갈피-AI-엔진-1단계-결정.md), 미완료·출시 차단 항목은 [BACKLOG.md](BACKLOG.md)에 있다. 구현 완료를 DB 적용·출시 완료로 해석하지 않는다.

2026-09 이전 컨셉의 추천 API·점수 체계·정기 배급·대화 만료는 폐기했다. 옛 문서는 [보관 문서](docs/archive/README.md), 옛 코드는 `v0-old-concept` 태그를 이력 확인용으로 본다.

## 작업 순서와 폐기 범위

**공통 기능 현황 조사·현황표 작성 계획은 폐기됐다.** 두 서비스의 여섯 기능을 조사해 표를 만들거나, 그 결과 승인을 후속 작업의 선행 조건으로 두지 않는다.

**공통 플랫폼 계획 전체는 유지한다.** `platform` 패키지와 `ops`·`notify`부터 만들고 서비스에 붙이는 방향, 이후 `ai`·`consent`·`pay`·`auth`·템플릿으로 이어지는 로드맵은 [멀티 서비스 플랫폼 스펙](docs/superpowers/specs/2026-10-15-멀티서비스-플랫폼-design.md) 14·16장을 따른다. 별콩톡 보안 수정은 공통 작업을 기다리지 않는다. 프롤로그 자체 기능 개발은 기존 결정대로 `notify` 연결 뒤 재개한다.

현재 작업 순서는 [ROADMAP.md](ROADMAP.md), 진행 상태는 미병합 브랜치의 `HANDOFF.md`, 상세 체크리스트는 [BACKLOG.md](BACKLOG.md)가 정본이다. 위 플랫폼 순서는 설계 이력이며 현재 작업 순서를 ROADMAP 대신 결정하지 않는다. 교대·완료 절차는 [인계 안내](docs/context/에이전트-인계.md)를 따른다. PR은 완료 시 만들고 병합은 운영자가 한다.

## 저장소 구조

```text
apps/api/               NestJS API, Prisma 스키마·마이그레이션
apps/mobile/            Expo 앱, mock 시나리오·화면용 도메인 모델
apps/admin/             Next.js 운영자 도구
packages/shared/src/    공유 계약·정책·타입·개인정보 처리·provider 인터페이스
supabase/policies/      RLS SQL
supabase/apply-policies.js  현재 RLS 적용 스크립트
docs/superpowers/       현행 설계·구현 계획·결정 기록
docs/context/           운영자 작업 방식·개발 환경
docs/archive/           폐기된 이전 컨셉 문서
```

## 클라우드에서 시작하기

Node.js **20 이상**, pnpm **9.12.0**이 필요하다. 전역 pnpm이 있으면 아래 `corepack pnpm`을 `pnpm`으로 바꿔도 된다. 일반 테스트·타입 검사·mock 화면 확인에는 Docker나 데스크톱 앱이 필요하지 않다.

```bash
bash scripts/agent/start.sh
# 작업 브랜치 선택 → HANDOFF 상태 재확인·자리 기록·커밋·푸시
bash scripts/agent/init.sh
corepack pnpm --filter @prologue/shared build

# DB·외부 서비스에 연결하지 않는 검증
corepack pnpm --filter @prologue/shared test
corepack pnpm --filter @prologue/api typecheck
corepack pnpm --filter @prologue/api test
corepack pnpm --filter @prologue/mobile test
```

shared는 `dist`를 내보내므로 첫 실행과 shared 변경 뒤에는 먼저 빌드한다. 환경별 Git 인증·실행 규칙은 [개발 환경](docs/context/개발-환경.md)을 본다. 회사 노트북의 SSH 별칭·계정 경로는 클라우드의 필수 조건이 아니다.

### 모바일 mock 미리보기

```bash
corepack pnpm --filter @prologue/mobile web
# http://localhost:8081

# 선택: 휴대폰 프레임
node scripts/device-frame.mjs
# http://localhost:8090
```

첫 실행은 갈피 대화방으로 들어간다. 설정 탭의 개발용 패널에서 시나리오 8종을 바꿀 수 있다. 클라우드의 화면 확인은 Vercel Preview를 사용하며, 브라우저·실기기 확인은 로컬에서 한다. 실기기 검증은 별도 Expo Go 또는 development build를 사용한다. 실제 카카오 OAuth의 네이티브 연결은 미구현이다([BACKLOG](BACKLOG.md) 6절).

### API·운영 도구 실행 (개발용 설정 필요)

필요한 키 이름은 루트와 각 앱의 `.env.example`에서 확인한다. 실제 `.env`·키를 출력하거나 커밋하지 않는다. API는 원격 dev DB를 사용하므로 **승인된 환경과 마이그레이션 적용 상태를 확인한 뒤** 실행한다. 갈피 테이블을 적용하지 않고 켜면 예약 작업이 실패한다. DB 적용 절차는 [supabase/README.md](supabase/README.md)를 따른다.

```bash
corepack pnpm --filter @prologue/api dev
# http://localhost:3001/api/health
# http://localhost:3001/api/docs (Swagger)

corepack pnpm --filter @prologue/admin dev
# http://localhost:3002
```

API 기본 경로는 `/api/v1`, Swagger는 `/api/docs`다. 모바일·관리자의 API 주소는 각각의 `.env.example`을 본다. 실기기에서는 `localhost` 대신 접근 가능한 개발 API 주소를 쓴다. `pnpm dev`는 전체 앱을 띄워 원격 DB 연결도 시작하므로 mock 미리보기만 볼 때는 모바일 명령만 쓴다.

## 아키텍처와 배포 목표

```text
Expo 앱 ── NestJS API ── Supabase Postgres / Storage
       └─ 허용된 직접 조회·실시간 수신 ── Supabase RLS / Realtime
Next.js 운영 도구 ── NestJS Admin API
```

| 역할               | 결정된 목표                                                 | 현재 코드                                    |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------- |
| API·운영 도구      | Vercel                                                      | API는 Node 서버 진입점, 운영 도구는 Next.js  |
| 예약·응답 뒤 작업  | Vercel Cron·`waitUntil`                                     | NestJS `@Cron`, 프로세스 내 비동기 실행      |
| 재시도             | Supabase 큐(pgmq) 또는 발송 대기표                          | 전환 전. BullMQ를 새 목표로 삼지 않는다      |
| OTP·세션·요청 제한 | Upstash Redis                                               | 서버 메모리, 출시 전 수정 대상               |
| DB 변경            | `supabase/migrations`에 스키마·RLS 통합, Prisma는 생성 도구 | `apps/api/prisma/migrations` + `pnpm db:rls` |
| 본인인증·결제      | 포트원 V2, 앱 인앱결제·웹 토스                              | provider 인터페이스와 mock, 실 연동 전       |

Railway는 쓰지 않는다. Vercel 설정·Cron 엔드포인트·Redis·큐·Supabase 미리보기 브랜치를 이미 구축한 것으로 안내하지 않는다. 세부 근거는 [아키텍처 결정](09_아키텍처_의사결정_v0_2.md), 현재 규약은 [개발 스펙](DEVELOPMENT_SPEC.md)을 본다.

## 환경 변수와 외부 서비스

- 키는 환경별로 분리한다. 클라우드는 비밀값 0을 유지하고, 키가 필요한 실행은 로컬에서 한다. 운영 설정은 운영자가 관리한다.
- `SUPABASE_SERVICE_ROLE_KEY`·`SUPABASE_JWT_SECRET`은 API 서버에만 둔다. 모바일·관리자 클라이언트에 넣지 않는다. 관리자 예시 파일에 남은 service role 자리도 사용하지 않는다([BACKLOG](BACKLOG.md) 9절).
- `PHONE_HASH_PEPPER`는 같은 DB를 쓰는 모든 환경에서 같아야 한다. 비밀번호 관리자에 보관한다. 바뀌면 기존 휴대폰 해시가 맞지 않으므로 임의 재생성하지 않는다.
- 현재 SMS·본인인증·얼굴·사진 검수·푸시·결제는 mock provider다. 예시 변수만 바꿔도 모두 real로 전환되는 구조는 아니다.
- 카카오는 `KAKAO_USER_INFO_PROVIDER=mock|real`, LLM은 `LLM_PROVIDER=mock|openai` 선택 코드가 있다. 카카오 실제 사용자 E2E 검증은 남아 있다. 실제 LLM은 동의 3종·가명처리·무보존 설정과 평가 세트 확인 후 켠다.

운영 환경변수의 목표 관리 위치는 API·관리자 **Vercel**, 모바일 빌드 **Expo EAS**, DB 관련 설정 **Supabase**다. 클라우드에 로컬 키를 복사하지 않는다. 실제 계정 연결과 실행 권한은 환경마다 확인한다.

## 자주 쓰는 명령

| 명령                                                | 설명                                         |
| --------------------------------------------------- | -------------------------------------------- |
| `corepack pnpm --filter @prologue/shared build`     | 공유 패키지 빌드                             |
| `corepack pnpm --filter @prologue/api test`         | API Vitest                                   |
| `corepack pnpm --filter @prologue/mobile test`      | 모바일 도메인 테스트(KST)                    |
| `corepack pnpm --filter @prologue/api typecheck`    | API 타입 검사                                |
| `corepack pnpm --filter @prologue/mobile typecheck` | 모바일 타입 검사                             |
| `corepack pnpm --filter @prologue/admin typecheck`  | 운영 도구 타입 검사                          |
| `corepack pnpm --filter @prologue/api build`        | API 빌드                                     |
| `corepack pnpm --filter @prologue/admin build`      | 운영 도구 빌드                               |
| `corepack pnpm db:rls`                              | **DB 적용 승인 후** 현재 정책 파일 일괄 적용 |

루트의 `lint`·`test`·`build`는 Turbo로 각 패키지 스크립트를 호출한다. 모바일 `build`는 EAS 원격 빌드이므로 일반 로컬 검증으로 실행하지 않는다. lint 설정 등 알려진 빈칸은 [BACKLOG](BACKLOG.md) 8절을 본다.

## API와 화면 계약

성공은 `{ "data": <T> }`, 실패는 `{ "error": { "code": "ERROR_CODE", "message": "...", "details"?: ... } }`다. 오류 코드는 [shared/errors.ts](packages/shared/src/errors.ts), 실제 엔드포인트는 컨트롤러와 Swagger를 기준으로 확인한다.

현행 화면 ID는 [화면 흐름 설계](docs/superpowers/specs/2026-09-11-화면-흐름-설계.md)의 A1~G5이며 새 파일의 `@screen` 주석으로 추적한다. mock 화면용 타입과 응답 DTO는 같지 않다. [모바일 서버 계약](apps/mobile/domain/types.ts)과 [갈피 공유 계약](packages/shared/src/galpi/contract.ts)을 확인하고, 상대 내부 ID·넘긴 이유·점수·인터뷰 원문을 공개하지 않는다.

## 라이선스

내부 사용. 외부 공개 전 별도 결정.
