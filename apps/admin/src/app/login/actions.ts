'use server';

import { redirect } from 'next/navigation';
import { adminApi, AdminApiError } from '@/lib/api';
import { getSession } from '@/lib/session';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요.' };
  }

  let result: Awaited<ReturnType<typeof adminApi.login>>;
  try {
    result = await adminApi.login(email, password);
  } catch (e) {
    if (e instanceof AdminApiError) {
      return { error: e.message };
    }
    return { error: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const session = await getSession();
  session.accessToken = result.accessToken;
  session.admin = result.admin;
  await session.save();

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
