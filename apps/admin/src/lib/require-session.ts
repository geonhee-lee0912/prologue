import { redirect } from 'next/navigation';
import { getSession, type AdminSession } from './session';

/**
 * 서버 컴포넌트에서 호출. 세션 없으면 로그인으로 리다이렉트.
 */
export async function requireSession(): Promise<Required<Pick<AdminSession, 'accessToken' | 'admin'>>> {
  const session = await getSession();
  if (!session.accessToken || !session.admin) {
    redirect('/login');
  }
  return { accessToken: session.accessToken, admin: session.admin };
}
