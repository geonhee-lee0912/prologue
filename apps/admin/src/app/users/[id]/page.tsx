import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { requireSession } from '@/lib/require-session';
import { StatusForm } from './status-form';

/**
 * K02 — 사용자 상세
 *
 * 프로필 요약, 인증 상태, 관계 성향, 최근 신고 이력, 운영자 상태 변경.
 */
export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();
  const u = await adminApi.getUser(accessToken, params.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <Link href="/users" className="text-sm text-zinc-500 hover:underline">
          ← 사용자 목록
        </Link>
        <h1 className="mt-2 font-mono text-base text-zinc-500">{u.id}</h1>
        <p className="mt-1 text-2xl font-semibold text-brand-ink">
          {age(u.birthYear)}세 / {genderLabel(u.gender)}{' '}
          <span className="ml-2 text-base font-normal text-zinc-500">
            {[u.region1, u.region2].filter(Boolean).join(' ') || '-'}
          </span>
        </p>
        <p className="mt-2 text-sm">
          상태 <StatusBadge status={u.status} /> · 멤버십 {u.membershipType} · 로그인{' '}
          {u.loginProvider} · 가입 {formatDate(u.createdAt)}
        </p>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <Panel title="프로필">
          {u.profile ? (
            <>
              <Row label="직업군" value={u.profile.jobCategory ?? '-'} />
              <Row label="자기소개" value={u.profile.intro ?? '-'} />
              <Row
                label="라이프스타일"
                value={u.profile.lifestyleTags.length ? u.profile.lifestyleTags.join(', ') : '-'}
              />
              <Row label="완성도" value={`${u.profile.completionScore}%`} />
            </>
          ) : (
            <p className="text-sm text-zinc-400">프로필 미작성</p>
          )}
        </Panel>

        <Panel title="인증·서약">
          <Row
            label="본인 인증"
            value={u.identityVerified ? formatDate(u.verification.identityVerifiedAt) : '미완료'}
            ok={u.identityVerified}
          />
          <Row
            label="얼굴 인증"
            value={
              u.faceMatchStatus === 'verified'
                ? formatDate(u.verification.faceVerifiedAt)
                : faceLabel(u.faceMatchStatus)
            }
            ok={u.faceMatchStatus === 'verified'}
          />
          <Row label="나이 확인" value={u.verification.ageVerified ? '완료' : '미완료'} ok={u.verification.ageVerified} />
          <Row label="매너 서약" value={u.verification.mannerPledgeAgreed ? '완료' : '미완료'} ok={u.verification.mannerPledgeAgreed} />
          <Row label="싱글 서약" value={u.verification.singlePledgeAgreed ? '완료' : '미완료'} ok={u.verification.singlePledgeAgreed} />
          <Row label="직업/재직" value={employmentLabel(u.verification.employmentVerificationStatus)} />
        </Panel>

        <Panel title="관계 성향">
          {u.relationshipPreference ? (
            <>
              <Row label="만남 목적" value={INTENT_LABEL[u.relationshipPreference.intent] ?? u.relationshipPreference.intent} />
              <Row label="속도" value={PACE_LABEL[u.relationshipPreference.pace] ?? u.relationshipPreference.pace} />
              <Row label="연락" value={CONTACT_LABEL[u.relationshipPreference.contactFrequency] ?? u.relationshipPreference.contactFrequency} />
            </>
          ) : (
            <p className="text-sm text-zinc-400">설문 미완료</p>
          )}
        </Panel>

        <Panel title="신고 이력">
          {u.lastReports.length === 0 ? (
            <p className="text-sm text-zinc-400">신고 없음</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {u.lastReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <span className="text-zinc-600">
                    {r.isReporter ? '발신' : '수신'} · {reportTypeLabel(r.reportType)}
                  </span>
                  <Link href={`/reports/${r.id}`} className="text-xs text-brand-accent hover:underline">
                    상세
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-brand-ink">계정 상태 변경</h2>
        <StatusForm userId={u.id} currentStatus={u.status} />
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string | null; ok?: boolean }) {
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="w-24 shrink-0 text-zinc-500">{label}</span>
      <span className={ok === undefined ? 'text-zinc-800' : ok ? 'text-emerald-700' : 'text-zinc-500'}>
        {value ?? '-'}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-zinc-100 text-zinc-600',
    active: 'bg-emerald-50 text-emerald-700',
    suspended: 'bg-red-50 text-red-700',
    withdrawn: 'bg-zinc-100 text-zinc-400',
  };
  const label: Record<string, string> = {
    pending: '대기',
    active: '활성',
    suspended: '정지',
    withdrawn: '탈퇴',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${map[status] ?? 'bg-zinc-100'}`}>
      {label[status] ?? status}
    </span>
  );
}

function genderLabel(g: string): string {
  return g === 'male' ? '남' : g === 'female' ? '여' : '-';
}

function age(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function faceLabel(s: string): string {
  switch (s) {
    case 'not_submitted':
      return '미제출';
    case 'pending':
      return '대기';
    case 'rejected':
      return '반려';
    default:
      return s;
  }
}

function employmentLabel(s: string): string {
  switch (s) {
    case 'not_submitted':
      return '미신청';
    case 'pending':
      return '검수 대기';
    case 'verified':
      return '인증 완료';
    case 'rejected':
      return '반려';
    default:
      return s;
  }
}

const INTENT_LABEL: Record<string, string> = {
  serious_long_term: '진지한 장기 관계',
  natural_dating: '자연스러운 연애',
  open_to_marriage: '결혼까지 열어둠',
  casual_meeting: '가벼운 만남',
  friendship_first: '친구처럼',
};
const PACE_LABEL: Record<string, string> = {
  slow: '천천히',
  moderate: '자연스럽게',
  fast: '빠르게',
};
const CONTACT_LABEL: Record<string, string> = {
  low: '가끔',
  medium: '적당히',
  high: '자주',
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  rude_message: '무례한 대화',
  sexual_content: '성적 표현',
  harassment: '괴롭힘',
  fake_information: '허위 정보',
  in_relationship: '기혼/연인 의심',
  scam_or_money_request: '금전 요구·사기',
  external_contact_pressure: '외부 연락처 강요',
  other: '기타',
};

function reportTypeLabel(t: string): string {
  return REPORT_TYPE_LABELS[t] ?? t;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
