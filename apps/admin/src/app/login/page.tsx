import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { LoginForm } from './login-form';

/**
 * K01 — 운영자 로그인
 *
 * email + password 로 NestJS `/admin/auth/login` 호출 → iron-session 에 토큰 저장.
 * 로그인 성공 시 `/dashboard` 로 이동.
 */
export default async function LoginPage() {
  const session = await getSession();
  if (session.accessToken) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">프롤로그 운영자</h1>
          <p className="mt-2 text-sm text-zinc-500">관리자 도구 접근을 위해 로그인해주세요.</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
