import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { requireSession } from '@/lib/require-session';
import { EmploymentDecisionForm, PhotoDecisionForm } from './decision-form';

/**
 * K03 — 인증 검수
 *
 * 두 큐를 한 화면에 표시:
 *  - 사진 검수 대기 (Photo.reviewStatus='pending')
 *  - 직업/재직 인증 신청 대기 (UserAuth.employmentVerificationStatus='pending')
 */
export default async function ReviewsPage() {
  const { accessToken } = await requireSession();
  const [photos, employment] = await Promise.all([
    adminApi.listPendingPhotos(accessToken),
    adminApi.listPendingEmployment(accessToken),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">인증 검수</h1>
          <p className="mt-1 text-sm text-zinc-500">
            사진 {photos.length}건 · 직업/재직 {employment.length}건 대기
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          대시보드
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium text-brand-ink">사진 검수</h2>
        {photos.length === 0 ? (
          <p className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-400">
            검수 대기 중인 사진이 없어요.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {photos.map((p) => (
              <li key={p.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                {p.signedUrl ? (
                  // 검수 대기 사진은 운영자만 signed URL 로 접근
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.signedUrl}
                    alt="검수 대기 사진"
                    className="mb-3 h-64 w-full rounded object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-64 w-full items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400">
                    이미지 로드 실패
                  </div>
                )}
                <div className="mb-3 space-y-1 text-xs text-zinc-600">
                  <p>
                    {p.user.gender === 'male' ? '남' : '여'} · {age(p.user.birthYear)}세 ·{' '}
                    {p.user.region1}
                  </p>
                  <p>
                    {p.photoType}
                    {p.isMain && <span className="ml-1 text-brand-accent">(대표)</span>}
                  </p>
                  {p.moderationFlags.length > 0 && (
                    <p className="text-amber-700">자동 검수 플래그: {p.moderationFlags.join(', ')}</p>
                  )}
                  <p className="text-zinc-400">등록 {formatDate(p.createdAt)}</p>
                  <p>
                    <Link
                      href={`/users/${p.userId}`}
                      className="text-brand-accent hover:underline"
                    >
                      사용자 상세
                    </Link>
                  </p>
                </div>
                <PhotoDecisionForm photoId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-brand-ink">직업/재직 인증</h2>
        {employment.length === 0 ? (
          <p className="rounded border border-zinc-200 bg-white p-6 text-sm text-zinc-400">
            검수 대기 중인 신청이 없어요.
          </p>
        ) : (
          <ul className="space-y-3">
            {employment.map((e) => (
              <li
                key={e.userId}
                className="flex items-start justify-between rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="text-sm">
                  <p className="font-mono text-xs text-zinc-500">{e.userId}</p>
                  <p className="mt-1 text-zinc-800">
                    {e.user.gender === 'male' ? '남' : '여'} · {age(e.user.birthYear)}세 ·{' '}
                    {[e.user.region1, e.user.region2].filter(Boolean).join(' ') || '-'}
                  </p>
                  <p className="mt-1 text-zinc-600">
                    직업군: {e.profileJobCategory ?? '미입력'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">신청 {formatDate(e.updatedAt)}</p>
                  <Link
                    href={`/users/${e.userId}`}
                    className="mt-2 inline-block text-xs text-brand-accent hover:underline"
                  >
                    사용자 상세
                  </Link>
                </div>
                <div className="w-64 shrink-0">
                  <EmploymentDecisionForm userId={e.userId} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
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
