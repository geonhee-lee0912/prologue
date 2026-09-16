# CLAUDE.md

이 파일은 클로드 코드가 이 저장소에서 작업할 때 따라야 할 지침이다. 작업을 시작하기 전 항상 이 문서를 먼저 읽고, 필요한 경우 `DEVELOPMENT_SPEC.md`, `09_아키텍처_의사결정_v0_2.md`, `docs/` 의 기획 문서를 확인한다.

---

## 1. 프로젝트 한 줄 요약

> **진열되지 않는 소개팅.** 여성은 아무에게도 노출되지 않고, 남성은 조건이 아니라 성의로 검증되며, AI는 사람에게는 못 하는 말을 받아 다음 소개를 좋게 만든다.

핵심 경험은 **"AI와 대화하고, 나를 이해받고, 좋은 상대가 나타나면 알림을 받고, 만난 뒤 어땠는지 말한다"** 이다.

**2026-09 컨셉 재설정 이후 기준이다.** 이전의 "인증 기반 진지한 소개팅 앱" 포지셔닝, 정기 추천 배급, 재화 모델, 추천 점수 체계는 **전부 폐기됐다.** 상세는 `docs/superpowers/specs/2026-09-02-컨셉-재설정-design.md`.

가벼운 데이팅 앱처럼 보여도 안 되고, 결정사처럼 무겁게 보여도 안 된다.

---

## 1.1 하드룰 — 컨셉을 지키는 8가지 (절대 위반 금지)

새 컨셉의 핵심이다. 이 중 하나라도 깨는 코드는 작성하지 않는다.

1. **진열 금지.** 검색·피드·둘러보기·목록이 존재하지 않는다. 프로필은 **AI가 고른 상대에게 1:1로만** 전달된다. "추천 목록", "탐색 탭", "오늘의 N명" 같은 UI를 만들지 않는다
2. **깊은 데이터는 AI만 본다.** AI 인터뷰 내용, 거절 이유, 조건 정보(학벌·연봉·주거)는 **어떤 사용자에게도** 노출되지 않는다. 상대에게 가는 것은 원본이 아니라 "왜 이 사람인가"에 대한 해석뿐
3. **정기 배급 금지.** "하루 N명 추천" 구조를 만들지 않는다. **좋은 상대가 나타났을 때만 알린다.** 후보 품질이 낮으면 알리지 않는다. 개수를 약속하지 않는다
4. **과금은 "대화 성립" 시점에만.** 양쪽 수락 후 앱 내에서 각자 2~3턴을 주고받았을 때 크레딧이 차감된다. **좋아요·사진 공개·대화방 개설·매칭 자체에 과금하지 않는다.** 만남도 과금 대상이 아니다
5. **연락처 교환을 권하지 않는다.** 가능하되 유도하지 않는다. 만남 당일 연락은 앱 내 음성통화로 해결한다
6. **체류 유도 장치 금지.** 읽음 확인, 온라인 상태, 답장 압박 알림을 넣지 않는다. **KPI는 DAU가 아니라 만남 성사다**
7. **주선은 100% AI.** 운영자 상시 검수를 두지 않는다. 단 사용자가 자동화된 결정의 거부·설명을 요청하면 사람이 대응하는 창구는 둔다
8. **조건으로 사람을 거르지 않는다.** 학벌·연봉·주거는 받되 진입 조건으로 쓰지 않고 프로필에 노출하지 않는다

### 조건 정보 3분류 (설계 시 반드시 구분)

| 분류 | 예 | 프로필 노출 |
|---|---|---|
| **실용 정보** | 생활권, 나이, 흡연, 결혼 의향 | 노출 |
| **신뢰 배지** | 신원 인증, **재직 확인(회사명 아님)**, 미혼 확인 | 노출 |
| **조건 신호** | 학교명, 연봉, 주거 형태, 직급, 회사명 | **AI만** |

---

## 2. 아키텍처 한 장 요약 (B안)

```
모바일 (Expo) ─── Supabase 직접 (단순 조회, 실시간 구독)
              └── NestJS (Railway) ─── Supabase service role
                                  └── Upstash Redis (OTP, 큐)
                                  └── 외부 서비스 (PASS/NICE, NHN Toast, Expo Push)

운영자 도구 (Next.js, Vercel) ─── NestJS Admin API
```

**Supabase**: PostgreSQL, Auth (JWT), Storage, Realtime, RLS
**NestJS (Railway)**: 비즈니스 로직, 본인인증, 추천 배치, BullMQ
**Upstash Redis**: OTP 임시 저장, BullMQ 큐
**Vercel**: 운영자 도구 호스팅만

자세한 내용은 `09_아키텍처_의사결정_v0_2.md`.

---

## 3. 작업 시작 전 항상 확인할 문서

| 작업 종류 | 우선 확인 문서 |
|---|---|
| **모든 작업 (최우선)** | **`docs/superpowers/specs/2026-09-02-컨셉-재설정-design.md`** — 컨셉·BM·설계 원칙·법적 검토. 아래 어떤 문서와 충돌하든 이 문서가 우선한다 |
| 새 기능 개발 | 위 문서 4·5·6장 → (참고만) `docs/08_기능요구사항서_v_0_1.md` |
| 데이터 모델 변경 | `docs/08_데이터항목_정의서_v_0_1.md` + `apps/api/prisma/schema.prisma` |
| RLS 정책 변경 | `09_아키텍처_의사결정_v0_2.md` 6장 + `supabase/policies/<table>.sql` |
| 추천/매칭 관련 | `docs/08_추천_알고리즘_기준서_v_0_1.md` |
| 사용자 카피 | `docs/prologue_02_copy_tone_guide_v0_1.md` + `docs/prologue_02_brand_identity_v0_2.md` |
| 용어 선택 | `docs/prologue_02_service_glossary_v0_1.md` + `docs/prologue_00_terms_expression_guide_v0_1.md` |
| 개인정보/공개 범위 | `docs/prologue_04_privacy_visibility_policy_v0_1.md` |
| 신고/차단 | `docs/prologue_04_report_block_sanction_policy_v0_1.md` |
| 안전 UX | `docs/prologue_04_safety_ux_guide_v0_1.md` |
| 기술 결정 | `DEVELOPMENT_SPEC.md` |

**`docs/` 의 기존 기획 문서 26종(v0.1~v1.1)과 `docs/superpowers/specs/2026-06-29-사용자앱-IA-v0.2-…` 는 폐기된 컨셉 기준이다. 참고용으로만 보고, 충돌하면 컨셉 재설정 문서를 따른다.**

- **무효**: 포지셔닝, 차별점 정의, 화면 IA(4탭 구조), 기능요구사항서, 추천 알고리즘 기준서, BM 전략, 가격 정책
- **유효 가능**: 개인정보·공개범위 정책, 신고·차단·제재 정책, 안전 UX 가이드, 인증 정책, 카피 금지 표현 목록

기획 문서와 충돌하는 코드를 작성하지 않는다. 판단이 서지 않으면 코드를 멈추고 사용자에게 묻는다.

---

## 4. 데이터 흐름 결정 흐름표

새 기능을 만들 때 항상 다음 순서로 결정한다.

```
이 작업이 …

1. 단순 조회인가? (자기 데이터 또는 RLS 로 허용된 상대 데이터 SELECT)
   ├ 그렇다 → 패턴 1: 모바일이 supabase.from('table').select() 직접
   └ 아니다 → 2번으로

2. 다른 사용자 데이터 변경, 외부 서비스 호출, 다단계 트랜잭션이 필요한가?
   ├ 그렇다 → 패턴 2: 모바일 → NestJS API → Supabase (service role)
   └ 아니다 → 3번으로

3. 실시간 데이터 수신이 필요한가? (새 메시지, 매칭 도착)
   ├ 그렇다 → 패턴 3: 모바일이 supabase.channel().on('postgres_changes') 구독
   └ 아니다 → 패턴 4: NestJS @Cron + BullMQ 백그라운드 작업
```

**판단이 애매하면 NestJS 경유 (패턴 2) 를 선택한다.** 보안 사고 비용이 크다.

---

## 5. 모노레포 작업 규칙

```
apps/api      → NestJS 백엔드 (Railway)
apps/mobile   → Expo 사용자 앱
apps/admin    → Next.js 운영자 도구 (Vercel)
packages/shared → 공유 타입/enum/상수/외부 서비스 인터페이스
supabase/     → 마이그레이션 SQL, RLS 정책 SQL, 시드
```

- **데이터 모델, enum, 상수 (거절 사유, 신고 사유, 추천 이유 템플릿)는 항상 `packages/shared/` 에 둔다.** 백엔드, 모바일, 관리자가 모두 import.
- **외부 서비스 (본인인증, SMS, 얼굴인증, 푸시, 결제) 호출은 인터페이스를 거친다.** 직접 SDK 호출 금지.
- **Supabase service role key 는 NestJS 환경 변수에만 둔다.** 모바일/관리자 클라이언트에 절대 노출 금지.
- 패키지 간 의존성은 단방향: `apps/*` → `packages/*`.

---

## 6. 데이터 모델 변경 작업 패턴

`apps/api/prisma/schema.prisma` 수정 시 항상 다음 순서.

```
1. schema.prisma 수정 (변경 이유 한 줄 주석)
2. pnpm --filter api prisma migrate dev --name <descriptive-name>
   → prisma/migrations/<timestamp>_<name>/migration.sql 자동 생성
3. 새 테이블/컬럼이라면 supabase/policies/<table>.sql 도 추가/수정
   - 모바일이 직접 SELECT 할 가능성이 있으면 RLS 필수
   - 점수, 거절 사유, 신고 내용은 컬럼 단위 차단
4. supabase db push (dev 프로젝트에 RLS 적용)
5. packages/shared/ 의 enum/타입 갱신
6. 영향받는 DTO, 서비스, 컨트롤러, 모바일 화면, 관리자 화면 모두 검색하여 수정
7. RLS 정책 테스트 추가 (pgTAP 또는 통합 테스트)
8. 데이터항목 정의서와 어긋나는 변경이라면 사용자에게 정의서 갱신 여부 확인
```

**중요**: Supabase Studio 에서 스키마/RLS 를 직접 변경하지 않는다. 모든 변경은 git → 마이그레이션 흐름.

---

## 7. RLS 정책 작성 규칙

### 7.1 작성 위치

`supabase/policies/<table>.sql` 한 파일에 해당 테이블의 모든 정책을 모은다.

### 7.2 기본 패턴

```sql
-- supabase/policies/profiles.sql

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 자신의 프로필 SELECT
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 매칭 또는 추천 관계가 있는 상대의 프로필 SELECT
CREATE POLICY "select_related_profile" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE (user_a_id = auth.uid() AND user_b_id = profiles.user_id)
         OR (user_b_id = auth.uid() AND user_a_id = profiles.user_id)
    )
    OR EXISTS (
      SELECT 1 FROM recommendations
      WHERE user_id = auth.uid() AND target_user_id = profiles.user_id
    )
  );

-- 자신의 프로필 UPDATE
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

### 7.3 절대 위반 금지

- `recommendations.total_score`, `trust_score`, `relationship_score` 등 점수 컬럼은 어떤 정책으로도 모바일에 SELECT 허용하지 않는다.
- `user_actions.skip_reason` 은 자신 것이라도 모바일에 SELECT 허용하지 않는다 (혼란 방지).
- `reports.description`, `reports.resolution_note` 는 운영자 외 누구도 SELECT 불가.
- 컬럼 차단이 필요하면 `GRANT SELECT (col1, col2) ON ...` 패턴 또는 별도 view.

### 7.4 service role 사용

NestJS 가 service role key 로 접근하면 RLS 가 우회된다. 이 경우 NestJS 코드에서 명시적으로 권한 검증을 한다.

```ts
// 잘못된 예: service role 로 검증 없이 INSERT
await supabaseAdmin.from('matches').insert({ ... });

// 올바른 예: NestJS 가 비즈니스 규칙 검증 후 INSERT
async createMatch(userA, userB) {
  await this.checkNotBlocked(userA, userB);
  await this.checkNotAlreadyMatched(userA, userB);
  await supabaseAdmin.from('matches').insert({ ... });
}
```

---

## 8. 화면 ID 와 기능 ID 추적

### 8.1 모바일 파일 명명 규칙

화면 ID(A01 ~ K05)는 파일명 prefix.

```
apps/mobile/app/(auth)/a03-login.tsx
apps/mobile/app/(verification)/b02-identity.tsx
apps/mobile/app/(tabs)/home.tsx                   // D01
apps/mobile/app/recommendation/[id]/card.tsx      // D02
```

### 8.2 백엔드 모듈 명명 규칙

```ts
// apps/api/src/auth/auth.controller.ts
/**
 * @fr FR-A01 회원가입
 * @fr FR-A02 로그인
 * @fr FR-A03 약관 동의
 */
@Controller('auth')
export class AuthController { ... }
```

### 8.3 커밋 메시지

```
feat(api): FR-B01 본인 인증 API 추가
feat(mobile): D02 추천 카드 화면 구현
feat(supabase): profiles RLS 정책 추가
fix(api): FR-G05 연락처 교환 동의 시 이중 알림 수정
```

---

## 9. 카피 작성 규칙 (절대 위반 금지)

### 9.1 절대 사용 금지 표현

추천/매칭:
- "운명의 상대", "완벽한 매칭", "100% 잘 맞아요", "반드시 잘 맞을 거예요"
- "프롤로그가 보장합니다", "실패 없는 추천"
- "당신보다 수준이 높은 상대", "고급 회원", "프리미엄 등급"
- "놓치면 후회해요", "지금 안 보면 끝나요"

대화/연락처:
- "곧 대화가 사라져요. 지금 잡으세요."
- "답장하지 않으면 매칭이 사라집니다"
- "지금 결제하지 않으면 기회를 잃어요"
- "상대가 기다리고 있어요. 빨리 답장하세요."

결제/유료:
- "프리미엄 회원만 선택받을 수 있어요"
- "결제하면 매칭 확률이 보장됩니다"

안전/개인정보:
- "걱정하지 마세요, 안전합니다"
- "100% 안전한 만남"
- "프롤로그가 알아서 지켜드립니다"
- "검증된 사람만 보여드립니다"

사람 상품화:
- "쓸어보기", "쇼핑하기", "사냥하기", "랭킹 보기"
- "품절", "대출", "반납", "장바구니", "소장"

### 9.2 권장 톤

차분한, 따뜻한, 신뢰감 있는, 성숙한, 설명적인.

### 9.3 핵심 용어 매핑

**책방 메타포(오늘의 프롤로그, 큐레이터의 메모, 첫문장이 이어졌어요 등)는 컨셉 재설정으로 보류 상태다.** 브랜드 판단이 끝나기 전까지 새 용어를 임의로 만들지 말고, 코드에서는 아래 중립 표현을 쓴다.

| 사용자 노출 (잠정) | 코드/DB |
|---|---|
| 소개 / 소개받기 | introduction, introduce |
| 소개 이유 | introductionReason |
| 수락 / 넘기기 | accept / pass |
| 서로 수락했어요 | mutualAccept |
| 대화 | conversation |
| 나를 알아가기 (AI 인터뷰) | interview, interviewSession |
| 나에 대한 리포트 | selfReport |
| 연결권 | connectionCredit |

**브랜드 확정 전까지 사용자 노출 문구는 PR에서 별도 확인을 받는다.**

---

## 10. 개인정보·민감 데이터 규칙 (절대 위반 금지)

### 10.1 절대 평문 저장 금지

- 휴대폰 번호: SHA-256 + pepper 후 `User.phoneHash` 만 저장.
- 본인 인증 응답의 이름, 생년월일: 검증 후 폐기.
- 얼굴 인증 이미지: Supabase Storage 보안 버킷, 24시간 TTL.
- 연락처: 상호 동의 전까지 어떤 응답에도 포함 금지.

### 10.2 응답에 절대 포함 금지

- 거절 사유 (자신/상대 모두)
- 신고 내용 (자신 신고 포함)
- 추천 점수 원본
- 차단 여부의 상세
- 운영자 메모
- 다른 사용자의 휴대폰/이메일/내부 식별자

응답을 만들 때는 항상 DTO/Serializer 를 거친다. Prisma 결과 또는 Supabase 결과를 그대로 응답에 넣지 않는다.

### 10.2b 민감정보 (절대 위반 금지)

개인정보보호법 제23조상 **사상·신념(종교), 건강, 성생활**은 민감정보이며 **다른 동의와 분리된 별도 동의** 없이는 처리 자체가 금지된다.

**AI 인터뷰는 자유 대화라서 우리가 묻지 않아도 민감정보가 들어온다.** ("전 연애는 왜 끝났나요?" → 건강·성생활·종교)

- 온보딩에서 **민감정보 별도 동의**를 다른 동의와 분리해 받고 항목·목적을 명시한다
- **저장 시 마스킹한다.** 단 매칭에 필요한 항목(종교 등)은 동의 범위 안에서 **구조화 필드로 별도 저장**하고, 우발적으로 흘러든 건강·성생활 언급만 마스킹한다. 둘을 같이 지우면 매칭이 불가능해진다
- **마스킹은 우리 DB만 보호한다.** 실시간 대화라 API 전송 시점은 막을 수 없으므로, 국외이전 동의 범위에 민감정보를 포함시킨다

### 10.2c 국외이전 (OpenAI API)

- **국외이전 별도 동의**를 받고 처리방침에 수탁자를 명시한다
- API 전송 데이터는 **가명처리**한다 (13장 AI 호출 규칙)
- OpenAI API의 **데이터 미학습·무보존(zero data retention) 설정을 확인**한다
- 개인정보보호위원회 「생성형 인공지능(AI) 개발·활용을 위한 개인정보 처리 안내서」(2025.8)를 실무 기준으로 삼는다

### 10.2d 자동화된 결정 (개인정보보호법 제37조의2)

주선은 100% AI다. 해당 가능성은 낮으나 대비한다.

- 처리방침에 자동화된 결정의 **기준과 절차를 공개**한다
- **거부·설명 요청 대응 창구**를 둔다 (상시 검수가 아니라 요청 시 인적 재처리)

### 10.3 로깅

- 휴대폰, 이메일, 인증 원본, 메시지 본문 로그 출력 금지.
- userId 만 로그에 남긴다.
- Sentry/외부 로그에 PII 가 흘러가지 않는지 매 변경 시 확인.

### 10.4 Supabase 키 관리

- `SUPABASE_SERVICE_ROLE_KEY`: NestJS 환경 변수에만. 절대 모바일/관리자 클라이언트 코드 또는 git 에 두지 않는다.
- `SUPABASE_ANON_KEY`: 모바일과 관리자 클라이언트에 노출 가능 (RLS 가 권한 강제).
- `SUPABASE_JWT_SECRET`: NestJS 가 토큰 검증할 때만 사용.

---

## 11. 외부 서비스 호출 규칙

본인인증, SMS, 얼굴 인증, 푸시, 결제 SDK 는 직접 호출 금지. 항상 인터페이스 경유.

```ts
// 잘못된 예
import { SMSClient } from 'nhn-toast-sdk';
await client.sendSMS(...);

// 올바른 예
constructor(
  @Inject('SmsProvider')
  private readonly sms: SmsProvider,
) {}

await this.sms.sendOtp(phoneNumber, code);
```

테스트와 로컬 개발은 mock provider. Storage 는 Supabase 직접 사용 (인터페이스 없이).

---

## 12. 매칭/대화 정책 (코드에 반영해야 할 정책)

기획 문서에서 결정된 정책은 magic number 대신 `packages/shared/policy.ts` 에 명시한다.

**이전 정책(대화 만료 7/14/21일, 추천 점수 가중치 6종, 하루 N장 추천)은 전부 폐기됐다.** 새 정책은 다음과 같다.

```ts
export const POLICY = {
  introduction: {
    // 정기 배급 금지. 개수를 약속하지 않는다.
    // 후보 품질이 임계 미만이면 소개하지 않는다.
    minQualityThreshold: /* TBD, 실측 후 확정 */ 0,
    dailyCap: null,          // 상한 없음. 좋은 상대가 있을 때만
  },
  credit: {
    // 차감은 "대화 성립" 시점에만.
    chargeOn: 'conversationEstablished',
    turnsRequiredEachSide: 2,   // TBD
    // 좋아요·사진공개·대화방개설·매칭에 과금하지 않는다
  },
  conversation: {
    expiryDays: null,        // 만료 없음. 붙잡지도 내보내지도 않는다
    readReceipts: false,     // 체류 유도 장치 금지
    onlineStatus: false,
  },
  contactExchange: {
    requireMutualConsent: true,
    autoExposeOnConsent: false,
    promote: false,          // 우리가 권하지 않는다
  },
  exposure: {
    searchEnabled: false,    // 진열 금지
    feedEnabled: false,
    browseEnabled: false,
  },
} as const;
```

정책이 바뀌면 이 파일과 컨셉 재설정 문서 둘 다 변경 PR에 포함한다.

## 13. 소개(주선) 시스템 작업 시 주의

**`08_추천 알고리즘 기준서`의 점수 체계(6개 컴포넌트, 가중치 25/20/20/15/10/10)는 폐기됐다.** 그 문서를 근거로 코드를 쓰지 않는다.

- **후보 필터는 LLM 앞단에서.** 임베딩·규칙으로 좁히고 LLM은 최종 5명만 판단한다(비용보다 지연시간 때문)
- 필수 제외: 인증 미완료, 차단 관계, 이미 소개됨, 최근 넘김
- **점수 숫자는 응답 어디에도 포함하지 않는다.** 설명형 문장만
- **후보 품질이 낮으면 소개하지 않는다.** 억지 소개 금지. 개수를 채우려고 기준을 낮추지 않는다
- **"운영자가 직접 골랐다"는 인상을 주는 표현 금지.** 주선은 100% AI다
- **공정성 제약이 필요하다.** 거절 이유 학습이 특정 외모·속성을 가진 사용자를 전체 노출에서 조용히 배제하지 않도록 한다. 외모 관련 신호는 **개인별 매칭에만 쓰고 전역 노출 순위에 반영하지 않는다**

### AI 호출 규칙

- **모델: GPT-5.6 Luna.** 1인 월 원가 60~100원 수준
- **프롬프트 캐싱 필수.** 없으면 원가가 몇 배가 된다
- **API에 보내는 데이터는 가명처리한다.** 이름·전화번호·생년월일 등 식별자를 제거하고 내부 ID로 치환한다 (국외이전 부담 경감 + AI는 실명을 알 필요가 없다)
- AI가 생성한 결과물임을 사용자에게 고지한다 (AI 기본법 생성형 AI 투명성 의무)

## 14. 테스트 작성 규칙

- 모든 FR P1 기능에 통합 테스트.
- 추천 점수 계산은 단위 테스트로 6개 차원 모두 검증.
- 카피 생성은 권장/금지 표현 정적 테스트.
- **RLS 정책은 정책 단위 테스트 필수.** 정책 실수가 PII 노출로 직결.
- 보안 변경 (인증, 권한, PII) 은 회귀 테스트 의무.

---

## 15. 자주 묻는 패턴

### 새 기능 시작 시 사용자에게 받아야 할 정보

- 관련 FR ID 와 화면 ID
- 데이터 흐름 패턴 (1~4 중 어느 것)
- 변경 대상 영역 (api / mobile / admin / supabase / packages)
- 기존 정책과 다른 점이 있는지

### 기획 문서와 코드가 다를 때

- 기본 원칙: **기획 문서가 우선**.
- 미결정 사항은 사용자에게 가설 확인 후 진행.
- 임의 진행 금지.

### 카피가 필요한 화면

1. 톤 가이드의 권장 표현으로 후보 3~5개 작성.
2. 금지 표현 체크리스트 통과 확인.
3. 사용자에게 어떤 후보가 좋은지 묻거나, 가장 일관된 후보 선택 후 PR 본문에 다른 후보 명시.

### 결제 압박/결핍 자극 의심 시

즉시 멈추고 사용자에게 확인. 추천권/Plus 안내, 대화 종료 안내, 빈 상태 화면이 위험 영역.

---

## 16. 절대 하지 않는 것 (요약)

- 사용자 응답에 추천 점수 숫자, 거절 사유, 신고 내용 포함 금지.
- 휴대폰 번호 평문 저장 금지.
- 외부 서비스 SDK 직접 호출 금지.
- Supabase service role key 를 모바일/관리자 클라이언트에 노출 금지.
- "운명", "완벽", "보장", "100%", "프롤로그가 알아서" 표현 금지.
- 사람을 상품으로 표현 금지.
- 다른 사용자의 식별자 응답에 포함 금지.
- 소개 부족 시 품질 기준을 낮춰 억지 소개 만들기 금지.
- 무료 사용자가 소개에서 배제되는 구조 금지.
- 답장 압박 기능 (읽음 확인, 온라인 상태) 추가 금지. **MVP 이후에도 금지.**
- **검색·피드·둘러보기·프로필 목록 UI 만들기 금지** (하드룰 1).
- **AI 인터뷰 내용·거절 이유·조건 정보(학벌/연봉/주거)를 다른 사용자에게 노출 금지** (하드룰 2).
- **"하루 N명 추천" 같은 정기 배급 구조 금지** (하드룰 3).
- **좋아요·사진 공개·대화방 개설·매칭 자체에 과금 금지** (하드룰 4).
- **연락처 교환을 유도하는 UI·카피 금지** (하드룰 5).
- **민감정보를 별도 동의 없이 처리하거나 마스킹 없이 저장 금지** (10.2b).
- **AI API에 식별자를 가명처리 없이 전송 금지** (10.2c).
- Supabase Studio 에서 스키마/RLS 직접 변경 금지.
- 모바일에서 messages, matches, reports, blocks 직접 INSERT 금지 (NestJS 경유 필수).

---

## 17. 자주 쓰는 명령어

```bash
# 의존성 설치
pnpm install

# Supabase CLI (별도 설치)
brew install supabase/tap/supabase   # macOS
# 또는: npm i -g supabase

# Supabase 프로젝트 연결
supabase login
supabase link --project-ref <dev-project-ref>

# 백엔드
pnpm --filter api dev
pnpm --filter api prisma migrate dev --name <name>
pnpm --filter api prisma studio       # DB GUI
pnpm --filter api test

# Supabase
supabase db push                       # 마이그레이션 + RLS 적용
supabase db pull                       # 원격 변경 가져오기 (Studio 변경 회수용, 권장 안 함)
supabase functions deploy <name>       # Edge Function (거의 안 씀)

# 모바일
pnpm --filter mobile dev
pnpm --filter mobile lint

# 관리자
pnpm --filter admin dev

# 전체
pnpm dev
pnpm lint
pnpm test
pnpm build
```

---

## 18. 변경 이력

- 2026-05-10: v0.1 최초 작성. NestJS + 자체 AWS 인프라 기준.
- 2026-09-11: v0.3 갱신. **2026-09 컨셉 재설정 반영.** 1장 한 줄 요약을 "진열되지 않는 소개팅"으로 교체하고 **1.1 하드룰 8가지** 신설. 3장 우선 문서를 컨셉 재설정 문서로 교체하고 기존 기획 문서 26종을 참고용으로 강등. 9.3 책방 메타포 용어 매핑을 보류하고 중립 용어로 대체. 12장 정책을 새 BM 기준으로 교체(대화 만료·추천 가중치·하루 N장 폐기). 13장을 추천 점수 체계 폐기 + AI 호출 규칙으로 교체. 10장에 민감정보·국외이전·자동화된 결정 규칙 추가. 16장 금지 목록에 하드룰 위반 항목 추가.
- 2026-05-10: v0.2 갱신. B안 (NestJS + Supabase 하이브리드) 채택. 4가지 데이터 흐름 패턴, RLS 정책 작성 규칙, Supabase 키 관리 규칙, Prisma + Supabase CLI 병행 마이그레이션 절차 추가. Docker Compose 와 socket.io 관련 내용 제거.
