import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { requireSession } from '@/lib/require-session';

/**
 * K04 — 신고 목록
 *
 * 기본은 처리 대기(pending) 만 표시. status query 로 다른 상태도 볼 수 있음.
 */
export default async function ReportsListPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const { accessToken } = await requireSession();
  const status = searchParams.status ?? 'pending';
  const page = Number(searchParams.page ?? '1');
  const { items, total } = await adminApi.listReports(accessToken, { status, page, pageSize: 20 });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">신고 관리</h1>
          <p className="mt-1 text-sm text-zinc-500">
            전체 {total}건 · 현재 필터: <span className="font-medium">{statusLabel(status)}</span>
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          대시보드
        </Link>
      </header>

      <nav className="mb-6 flex gap-2 text-sm">
        {(['pending', 'reviewing', 'resolved', 'rejected', 'all'] as const).map((s) => (
          <Link
            key={s}
            href={`/reports?status=${s}`}
            className={`rounded-full border px-3 py-1 ${
              status === s
                ? 'border-brand-ink bg-brand-ink text-white'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {statusLabel(s)}
          </Link>
        ))}
      </nav>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">접수일</th>
              <th className="px-4 py-3">유형</th>
              <th className="px-4 py-3">신고자</th>
              <th className="px-4 py-3">피신고자</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  표시할 신고가 없어요.
                </td>
              </tr>
            )}
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-zinc-600">{formatDate(r.createdAt)}</td>
                <td className="px-4 py-3">{reportTypeLabel(r.reportType)}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {age(r.reporter.birthYear)}세 / {genderLabel(r.reporter.gender)}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {age(r.targetUser.birthYear)}세 / {genderLabel(r.targetUser.gender)}
                  {r.targetUser.status === 'suspended' && (
                    <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                      정지됨
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/reports/${r.id}`}
                    className="text-sm font-medium text-brand-accent hover:underline"
                  >
                    상세
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <Pagination total={total} page={page} pageSize={20} status={status} />
      )}
    </main>
  );
}

function Pagination({
  total,
  page,
  pageSize,
  status,
}: {
  total: number;
  page: number;
  pageSize: number;
  status: string;
}) {
  const lastPage = Math.ceil(total / pageSize);
  return (
    <div className="mt-6 flex justify-center gap-2 text-sm">
      {page > 1 && (
        <Link
          href={`/reports?status=${status}&page=${page - 1}`}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
        >
          이전
        </Link>
      )}
      <span className="px-3 py-1.5 text-zinc-500">
        {page} / {lastPage}
      </span>
      {page < lastPage && (
        <Link
          href={`/reports?status=${status}&page=${page + 1}`}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
        >
          다음
        </Link>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'pending'
      ? 'bg-amber-50 text-amber-700'
      : status === 'reviewing'
        ? 'bg-blue-50 text-blue-700'
        : status === 'resolved'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-zinc-100 text-zinc-600';
  return <span className={`rounded px-2 py-0.5 text-xs ${color}`}>{statusLabel(status)}</span>;
}

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
    case 'all':
      return '전체';
    default:
      return s;
  }
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

function reportTypeLabel(t: string): string {
  return REPORT_TYPE_LABELS[t] ?? t;
}

function genderLabel(g: string): string {
  return g === 'male' ? '남' : g === 'female' ? '여' : '-';
}

function age(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
