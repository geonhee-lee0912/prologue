import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { requireSession } from '@/lib/require-session';
import { ResolveForm } from './resolve-form';

/**
 * K04 — 신고 상세
 *
 * 신고 description, 운영자 메모, 관련 대화, 피신고자의 과거 신고 수 표시.
 * description / resolutionNote 는 운영자 전용 (RLS · API 가드).
 */
export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const { accessToken } = await requireSession();
  const report = await adminApi.getReport(accessToken, params.id);

  const resolved = report.status === 'resolved' || report.status === 'rejected';

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <Link href="/reports" className="text-sm text-zinc-500 hover:underline">
          ← 신고 목록
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-brand-ink">
          {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          접수 {formatDateTime(report.createdAt)} · 상태{' '}
          <span className="font-medium">{statusLabel(report.status)}</span>
        </p>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <UserCard title="신고자" user={report.reporter} />
        <UserCard
          title="피신고자"
          user={report.targetUser}
          extra={
            <>
              {report.targetUser.profile?.jobCategory && (
                <Row label="직업군" value={report.targetUser.profile.jobCategory} />
              )}
              {report.targetUser.profile?.intro && (
                <Row label="자기소개" value={report.targetUser.profile.intro} />
              )}
              <Row
                label="과거 신고 수"
                value={`${report.targetUser.pastReportCount}건`}
                emphasis={report.targetUser.pastReportCount >= 3}
              />
            </>
          }
        />
      </section>

      {report.description && (
        <section className="mb-6 rounded-lg border border-zinc-200 bg-amber-50/50 p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            신고자 상세 (운영자만 열람)
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-800">{report.description}</p>
        </section>
      )}

      {report.reportedMessage && (
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            신고된 메시지
          </h2>
          <p className="text-sm text-zinc-700">{report.reportedMessage.content}</p>
          <p className="mt-2 text-xs text-zinc-400">
            {formatDateTime(report.reportedMessage.createdAt)}
          </p>
        </section>
      )}

      {report.conversation && (
        <section className="mb-6 rounded-lg border border-zinc-200 bg-white">
          <header className="border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-medium text-brand-ink">
              관련 대화 ({report.conversation.messages.length}개 메시지)
            </h2>
          </header>
          <ul className="divide-y divide-zinc-50 px-4 py-2">
            {report.conversation.messages.slice(-30).map((m) => (
              <li key={m.id} className="py-2">
                <p className="text-xs text-zinc-400">
                  {m.senderId === report.reporter.id
                    ? '신고자'
                    : m.senderId === report.targetUser.id
                      ? '피신고자'
                      : '시스템'}{' '}
                  · {formatDateTime(m.createdAt)}
                </p>
                <p className="text-sm text-zinc-800">{m.content}</p>
              </li>
            ))}
          </ul>
          {report.conversation.messages.length > 30 && (
            <p className="px-4 pb-3 text-xs text-zinc-400">
              최근 30개만 표시 · 전체 {report.conversation.messages.length}개
            </p>
          )}
        </section>
      )}

      {resolved ? (
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            처리 결과
          </h2>
          <p className="text-sm text-zinc-800">
            {statusLabel(report.status)} · {report.resolvedAt && formatDateTime(report.resolvedAt)}
          </p>
          {report.resolutionNote && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
              {report.resolutionNote}
            </p>
          )}
        </section>
      ) : (
        <ResolveForm reportId={report.id} />
      )}
    </main>
  );
}

function UserCard({
  title,
  user,
  extra,
}: {
  title: string;
  user: {
    id: string;
    gender: string;
    birthYear: number;
    region1: string;
    region2: string | null;
    status: string;
  };
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h2>
      <Row label="ID" value={user.id} mono />
      <Row label="나이/성별" value={`${age(user.birthYear)}세 / ${genderLabel(user.gender)}`} />
      <Row label="지역" value={[user.region1, user.region2].filter(Boolean).join(' ') || '-'} />
      <Row
        label="계정 상태"
        value={user.status}
        emphasis={user.status === 'suspended' || user.status === 'withdrawn'}
      />
      {extra}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex gap-2 py-1 text-sm">
      <span className="w-20 shrink-0 text-zinc-500">{label}</span>
      <span
        className={`${mono ? 'font-mono text-xs' : ''} ${emphasis ? 'font-medium text-red-700' : 'text-zinc-800'}`}
      >
        {value}
      </span>
    </div>
  );
}

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

function statusLabel(s: string): string {
  switch (s) {
    case 'pending':
      return '대기';
    case 'reviewing':
      return '검토 중';
    case 'resolved':
      return '처리 완료';
    case 'rejected':
      return '무근거';
    default:
      return s;
  }
}

function genderLabel(g: string): string {
  return g === 'male' ? '남' : g === 'female' ? '여' : '-';
}

function age(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
