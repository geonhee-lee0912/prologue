# 다음 단계 (Getting Started with Claude Code)

이 문서는 환경 세팅 파일을 받은 직후 클로드 코드와 함께 진행할 작업 순서를 제안한다.

---

## 0. 사전 준비 (사용자 직접)

이 단계는 클로드 코드가 대신 해줄 수 없다.

### 0.1 도구 설치

- [ ] Node.js 20 LTS 설치 ([nodejs.org](https://nodejs.org))
- [ ] pnpm 9 이상 설치 (`npm i -g pnpm`)
- [ ] Supabase CLI 설치 (`brew install supabase/tap/supabase` 또는 `npm i -g supabase`)
- [ ] Git 설치 확인 (Mac 은 보통 기본 설치, Windows 는 [git-scm.com](https://git-scm.com))

### 0.2 외부 서비스 계정 생성

- [ ] **Supabase**: [supabase.com](https://supabase.com) 가입
  - dev 프로젝트 생성 (이름: `prologue-dev`, 서울 리전, 무료 티어)
  - prod 프로젝트 생성 (이름: `prologue-prod`, 서울 리전, Pro 플랜 $25/월)
- [ ] **Railway**: [railway.com](https://railway.com) 가입 (Hobby 플랜 $5/월)
- [ ] **Upstash**: [upstash.com](https://upstash.com) 가입
  - Redis 데이터베이스 생성 (이름: `prologue-redis`, 서울 리전, 무료 티어)
- [ ] **Vercel**: 이미 가입되어 있음 (다른 서비스 운영 중)

### 0.3 베타 출시 시점에 필요 (지금은 미루기 가능)

- [ ] 본인 인증 업체 검토 (PASS 또는 NICE) → 베타 직전 계약
- [ ] SMS 업체 가입 (NHN Toast 권장) → 베타 직전 계약
- [ ] Apple Developer 계정 ($99/년)
- [ ] Google Play 계정 ($25 1회)
- [ ] AWS 계정 (Rekognition 사용 시)
- [ ] Sentry 가입 (선택)

---

## 1. 저장소 초기화 (10~20분)

클로드 코드 (Code 탭) 에서 이 폴더를 열고:

> 이 환경 세팅 파일들을 받았어. README.md, DEVELOPMENT_SPEC.md, CLAUDE.md, 09_아키텍처_의사결정_v0_2.md 를 먼저 모두 읽어줘.
> 그 다음 pnpm install 이 동작하도록 각 앱 폴더에 최소한의 빈 진입 파일을 만들고, git 초기화해줘.

작업 결과 확인:
- [ ] `pnpm install` 성공
- [ ] git 저장소 초기화됨
- [ ] 첫 커밋 완료

---

## 2. Supabase 프로젝트 연결과 첫 마이그레이션 (30분~1시간)

### 2.1 환경 변수 입력

Supabase 대시보드 → Settings → API 에서 값을 복사해 `.env` 에 넣는다.

dev 프로젝트의 값:

- `SUPABASE_URL` (Project URL)
- `SUPABASE_ANON_KEY` (anon public key)
- `SUPABASE_SERVICE_ROLE_KEY` (service_role secret key — 노출 주의)
- `SUPABASE_JWT_SECRET` (Settings → API → JWT Secret)
- `DATABASE_URL` (Settings → Database → Connection string → URI, pgbouncer 모드)

Upstash 대시보드 에서:

- `REDIS_URL` (Connect → "redis://" 형식 URL)

### 2.2 클로드 코드에게:

> Supabase CLI 설치 확인하고, supabase login 후 dev 프로젝트에 연결해줘.
> 그 다음 apps/api/prisma/schema.prisma 를 dev Supabase 에 마이그레이션해줘.
> 마지막으로 supabase/policies/ 의 모든 RLS 정책을 supabase db push 로 적용해줘.

작업 결과 확인:
- [ ] Supabase Studio 의 Table Editor 에서 모든 테이블 보임
- [ ] 각 테이블에 RLS 가 활성화되어 있음
- [ ] `prisma studio` 로 데이터 확인 가능

---

## 3. 백엔드 기본 골격 (1~2일)

기능 단위가 아니라 **횡단 관심사부터** 만든다.

클로드 코드에게 차례로:

1. NestJS 부트스트랩 + 헬스체크 + Swagger 설정
2. Supabase JWT 검증 가드 (`@CurrentUser`, `@Public` 데코레이터)
3. 글로벌 예외 필터 + validation pipe + 응답 인터셉터 (errors 패키지 사용)
4. PrismaModule + PrismaService (Supabase Postgres 연결)
5. SupabaseModule + SupabaseService (service role key 로 Storage/Auth Admin SDK)
6. Pino 로거 (PII 마스킹)
7. Throttler 설정
8. 외부 서비스 인터페이스 + mock 구현체

---

## 4. P1 핵심 플로우 1차 구현 (1~2주)

`08_기능요구사항서` 의 P1 기능을 다음 순서로 구현. 각 단계마다 백엔드 → 모바일 → 통합 테스트 순.

각 기능을 시작할 때 클로드 코드에 알려줄 것:
- FR ID
- 화면 ID
- 데이터 흐름 패턴 (CLAUDE.md 4번 참고)

순서:
1. **FR-A 시리즈**: 회원가입, 로그인, 약관 동의 (자체 OTP 흐름 + Supabase Admin SDK 로 사용자 생성)
2. **FR-B01, FR-B02, FR-B03**: 본인 인증, 얼굴 인증, 나이 확인 (모두 mock)
3. **FR-B05~B07**: 관계 목적 설문, 매너 서약, 싱글 상태 서약
4. **FR-C 시리즈**: 프로필 작성 (Supabase Storage 사진 업로드 포함)
5. **FR-D01~D05**: 추천 후보 생성 (룰 기반), 추천 카드, 프로필 상세, 매칭 리포트 요약
6. **FR-E 시리즈**: 관심 보내기, 넘기기, 거절 사유 수집
7. **FR-F 시리즈**: 상호 매칭, 안전 안내, 첫 대화 주제
8. **FR-G 시리즈**: 대화방 (Supabase Realtime 구독), 대화 기간, 연락처 교환
9. **FR-H 시리즈**: 신고, 차단

---

## 5. 관리자 도구 1차 (3~5일)

K01 ~ K04 화면. 단순 표 + 필터 + 액션 버튼으로 시작.

1. K01 운영자 로그인 (Supabase Auth + 운영자 권한 검증)
2. K02 사용자 목록 (검색, 인증 상태 필터)
3. K03 인증 검수 (사진, 직업/재직 인증)
4. K04 신고 관리 (대화 컨텍스트 포함, 운영자만 SELECT 가능한 RLS 정책)

---

## 6. 외부 서비스 실 연동 (계약 완료 후)

mock provider 를 실제 구현체로 교체.

1. SMS (NHN Toast)
2. 본인 인증 (PASS / NICE)
3. 얼굴 인증 (AWS Rekognition / Clova)
4. 사진 검수 (AWS Rekognition Moderation)
5. 푸시 (Expo)

---

## 7. 베타 준비

1. CI/CD (GitHub Actions)
2. Railway production 배포 환경 분리
3. Supabase prod 프로젝트로 마이그레이션/정책 적용
4. Vercel production 배포
5. Sentry 연동 (선택)
6. EAS Build 구성, TestFlight / 내부 테스트 트랙
7. QA 체크리스트 작성
8. 베타 모집 페이지

---

## 어떤 작업이든 클로드 코드에 줄 때

다음 정보를 함께 전달.

1. 관련 FR ID 와 화면 ID
2. 데이터 흐름 패턴 (1~4 중 어느 것)
3. 변경 대상 영역 (api / mobile / admin / supabase / packages)
4. 사용자에게 보이는 카피가 있다면 톤 가이드 위반 여부 검토 요청
5. PR 본문에 기획 문서 링크와 변경 내역 명시

`CLAUDE.md` 의 절대 금지 사항(카피 표현, 개인정보 처리, RLS 위반, 외부 SDK 직접 호출 등)은 항상 준수.

---

## 자주 막히는 지점

### "DATABASE_URL 연결이 안 돼요"

- Supabase 대시보드 → Settings → Database → Connection string → URI 의 두 가지 모드 확인
  - **Pooler (port 6543, pgbouncer)**: 일반 쿼리에 사용, `DATABASE_URL` 에 입력
  - **Direct (port 5432)**: 마이그레이션에 사용, `DIRECT_URL` 에 입력
- Prisma schema 의 `datasource db` 블록에 `directUrl` 추가 필요

### "RLS 정책 때문에 데이터가 안 보여요"

- 의도된 동작이다. 모바일은 RLS 가 허용한 데이터만 SELECT 가능.
- 디버깅 시 Supabase Studio → Authentication → Users 에서 테스트 사용자 만들고 그 토큰으로 시도.
- service role key 로 접근하면 RLS 우회. NestJS 가 그렇게 동작.

### "Supabase Realtime 메시지가 도착 안 해요"

- 해당 테이블이 Realtime publication 에 추가되어 있는지 확인
- `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`
- RLS 정책이 SELECT 를 허용해야 구독도 가능
