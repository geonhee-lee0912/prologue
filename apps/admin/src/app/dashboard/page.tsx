import Link from 'next/link';
import { requireSession } from '@/lib/require-session';
import { logoutAction } from '../login/actions';

/**
 * 운영자 대시보드 (K01 로그인 직후 기본 진입).
 *
 * K02 사용자 목록 / K03 인증 검수 / K04 신고 관리로 진입.
 */
export default async function DashboardPage() {
  const { admin } = await requireSession();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">운영자 대시보드</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {admin.email} · <span className="uppercase tracking-wide">{admin.role}</span>
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            로그아웃
          </button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <CardLink
          title="K02 · 사용자 목록"
          desc="검색, 가입일, 인증 상태, 신고 이력"
          href="/users"
          status="열기"
        />
        <CardLink
          title="K03 · 인증 검수"
          desc="사진/직업 인증 승인·반려"
          href="/reviews"
          status="열기"
        />
        <CardLink
          title="K04 · 신고 관리"
          desc="신고 처리 및 제재 조치"
          href="/reports"
          status="열기"
        />
      </section>
    </main>
  );
}

function CardLink({
  title,
  desc,
  href,
  status,
}: {
  title: string;
  desc: string;
  href: string;
  status: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-brand-ink"
    >
      <h2 className="text-base font-medium text-brand-ink">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{desc}</p>
      <p className="mt-3 text-xs text-brand-accent">{status} →</p>
    </Link>
  );
}
