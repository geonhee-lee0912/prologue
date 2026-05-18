import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <h1 className="text-xl font-semibold text-brand-ink">페이지를 찾을 수 없어요.</h1>
      <p className="mt-2 text-sm text-zinc-500">주소를 다시 확인해주세요.</p>
      <Link href="/dashboard" className="mt-6 text-sm text-brand-accent underline">
        대시보드로
      </Link>
    </main>
  );
}
