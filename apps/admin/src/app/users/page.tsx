import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { requireSession } from '@/lib/require-session';

/**
 * K02 — 사용자 목록
 *
 * 검색(q), 계정 상태, 인증 상태 필터, 페이지네이션.
 */
export default async function UsersListPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; verified?: string; page?: string };
}) {
  const { accessToken } = await requireSession();
  const q = searchParams.q ?? '';
  const status = searchParams.status ?? 'all';
  const verified = searchParams.verified ?? 'all';
  const page = Number(searchParams.page ?? '1');

  const { items, total } = await adminApi.listUsers(accessToken, {
    q: q || undefined,
    status,
    identityVerified:
      verified === 'identity'
        ? true
        : verified === 'identity_not'
          ? false
          : undefined,
    faceVerified:
      verified === 'face' ? true : verified === 'face_not' ? false : undefined,
    page,
    pageSize: 20,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">사용자 목록</h1>
          <p className="mt-1 text-sm text-zinc-500">전체 {total}명</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          대시보드
        </Link>
      </header>

      <form className="mb-4 flex flex-wrap gap-2" action="/users" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="UUID 또는 지역 검색"
          className="w-72 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-brand-ink focus:outline-none"
        />
        <Select name="status" defaultValue={status}>
          <option value="all">전체 상태</option>
          <option value="pending">대기</option>
          <option value="active">활성</option>
          <option value="suspended">정지</option>
          <option value="withdrawn">탈퇴</option>
        </Select>
        <Select name="verified" defaultValue={verified}>
          <option value="all">인증 무관</option>
          <option value="identity">본인 인증 완료</option>
          <option value="identity_not">본인 인증 미완료</option>
          <option value="face">얼굴 인증 완료</option>
          <option value="face_not">얼굴 인증 미완료</option>
        </Select>
        <button
          type="submit"
          className="rounded-md bg-brand-ink px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          검색
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">가입일</th>
              <th className="px-3 py-3">기본</th>
              <th className="px-3 py-3">지역</th>
              <th className="px-3 py-3">로그인</th>
              <th className="px-3 py-3">인증</th>
              <th className="px-3 py-3">신고</th>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                  조건에 맞는 사용자가 없어요.
                </td>
              </tr>
            )}
            {items.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-3 text-zinc-600">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-3">
                  {age(u.birthYear)}세 / {genderLabel(u.gender)}
                </td>
                <td className="px-3 py-3 text-zinc-600">
                  {[u.region1, u.region2].filter(Boolean).join(' ') || '-'}
                </td>
                <td className="px-3 py-3 text-zinc-500">{u.loginProvider}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <Badge ok={u.identityVerified} label="본인" />
                    <Badge ok={u.faceMatchStatus === 'verified'} label="얼굴" />
                  </div>
                </td>
                <td className="px-3 py-3">
                  {u.reportsReceivedCount > 0 ? (
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        u.reportsReceivedCount >= 3
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {u.reportsReceivedCount}건
                    </span>
                  ) : (
                    <span className="text-zinc-300">·</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <UserStatusBadge status={u.status} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/users/${u.id}`}
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
        <Pagination
          total={total}
          page={page}
          pageSize={20}
          baseQs={new URLSearchParams(
            Object.entries({ q, status, verified }).filter(([, v]) => v),
          ).toString()}
        />
      )}
    </main>
  );
}

function Select({
  name,
  defaultValue,
  children,
}: {
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-brand-ink focus:outline-none"
    >
      {children}
    </select>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
      }`}
    >
      {label}
    </span>
  );
}

function UserStatusBadge({ status }: { status: string }) {
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

function Pagination({
  total,
  page,
  pageSize,
  baseQs,
}: {
  total: number;
  page: number;
  pageSize: number;
  baseQs: string;
}) {
  const lastPage = Math.ceil(total / pageSize);
  const link = (p: number) =>
    `/users?${baseQs ? `${baseQs}&` : ''}page=${p}`;
  return (
    <div className="mt-6 flex justify-center gap-2 text-sm">
      {page > 1 && (
        <Link
          href={link(page - 1)}
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
          href={link(page + 1)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
        >
          다음
        </Link>
      )}
    </div>
  );
}

function genderLabel(g: string): string {
  return g === 'male' ? '남' : g === 'female' ? '여' : '-';
}

function age(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}
