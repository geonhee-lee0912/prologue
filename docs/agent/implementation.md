# 구현 상세 지침

[루트 지침](../../AGENTS.md)의 상세 문서다. 절 번호는 기존 참조를 위해 유지한다. 이 문서의 파일 경로는 저장소 루트 기준이다.

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
   └ 아니다 → 패턴 4: 백그라운드 작업 — 목표는 Vercel Cron + waitUntil / Supabase 큐(현재는 NestJS @Cron)
```

**판단이 애매하면 NestJS 경유 (패턴 2) 를 선택한다.** 보안 사고 비용이 크다.

---

## 6. 데이터 모델 변경 작업 패턴

1. `apps/api/prisma/schema.prisma` 를 바꾸고 이유를 남긴다.
2. 원격 DB에 붙지 않는 `prisma migrate diff` 로 SQL을 만들어 `apps/api/prisma/migrations/<timestamp>_<name>/migration.sql` 에 둔다. 정확한 명령은 `supabase/README.md`.
3. `supabase/policies/<table>.sql` 에 RLS를 추가·수정한다. 직접 읽지 않는 테이블도 RLS를 켜고 클라이언트 정책은 두지 않는다.
4. `packages/shared/src/` 의 타입·enum·정책과 영향받는 DTO·서비스·화면을 함께 수정한다.
5. 정책 파일 검사와 변경에 맞는 테스트를 실행한다. 실제 접근 거부 검증의 남은 일은 `BACKLOG.md` 1·9절에 유지한다.
6. **원격 DB 적용은 사람 확인 후** 현재 방식인 `prisma migrate deploy` → `pnpm db:rls` 순서로 한다. `supabase db push` 가 현재 정책 디렉터리를 적용하는 것으로 안내하지 않는다.

향후 Supabase 미리보기 브랜치에 맞춰 마이그레이션·RLS를 `supabase/migrations` 로 통합한다는 결정은 아직 미적용이다. Supabase Studio에서 스키마/RLS를 직접 바꾸지 않는다.

---

## 7. RLS 정책 작성 규칙

### 7.1 작성 위치

`supabase/policies/<table>.sql` 한 파일에 해당 테이블의 모든 정책을 모은다.

### 7.2 기본 패턴

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
```

이 예시는 자기 프로필 조회만 설명한다. 실제 전체 정책은 `supabase/policies/profiles.sql` 을 본다. 상대 공개 범위를 바꾸기 전에 DTO·컬럼 제한과 하드룰을 함께 확인한다. 삭제된 `recommendations`, `user_actions` 테이블을 되살리는 정책을 만들지 않는다.

### 7.3 절대 위반 금지

- 점수·넘긴 이유·신고 원문·운영 메모는 클라이언트에 공개하지 않는다. 행 접근 정책만으로 컬럼이 가려지지 않는다. 필요한 경우 view 또는 컬럼별 GRANT와 API DTO를 사용한다.
- 갈피 테이블은 `supabase/policies/galpi.sql` 처럼 클라이언트 정책 없이 RLS만 켠다. 대화·서고·리포트의 허용된 열람은 NestJS가 검증하고 전용 DTO로 보낸다.
- 권한을 넓힐 때는 실제 역할(anon·authenticated)로 접근 거부를 검증한다.

---

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

현행 화면 ID는 화면 흐름 설계의 **A1~G5**다. 앱 IA v2 이후 한 화면이 여러 ID를 품으므로 파일 맨 위 `@screen` 주석에 적는다. 라우트는 `app/(tabs)/friends.tsx`, `app/galpi/chat.tsx`, `app/letter/[id].tsx` 처럼 뜻이 보이는 이름을 쓴다. 매핑은 서비스 구성·위계 스펙 3.5를 본다.

옛 A01~K05·FR-\*는 남아 있는 코드의 이력이다. 새 화면 파일에 옛 ID prefix를 강제하지 않는다.

---

### 8.2 백엔드 모듈 명명 규칙

기능 이름으로 모듈·컨트롤러를 나누고, 주석에 현행 설계와 담당 동작을 적는다. 기존 `@fr FR-*`는 이력으로 남길 수 있지만 새 기능에 폐기된 FR ID를 요구하지 않는다. 예: `apps/api/src/galpi/galpi.controller.ts`.

### 8.3 커밋 메시지

```
feat(api): 갈피 대화 API 추가
feat(mobile): D1 소개 편지 화면 구현
feat(supabase): profiles RLS 정책 추가
docs: 작업 지침과 실행 안내 갱신
```

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
