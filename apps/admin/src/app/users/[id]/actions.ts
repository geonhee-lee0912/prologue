'use server';

import { revalidatePath } from 'next/cache';
import { AdminApiError, adminApi } from '@/lib/api';
import { requireSession } from '@/lib/require-session';

export interface UserStatusState {
  error?: string;
  ok?: boolean;
}

export async function setUserStatusAction(
  userId: string,
  _prev: UserStatusState,
  formData: FormData,
): Promise<UserStatusState> {
  const status = String(formData.get('status') ?? '');
  const note = String(formData.get('note') ?? '').trim() || undefined;
  if (status !== 'active' && status !== 'suspended') {
    return { error: '변경할 상태를 선택해주세요.' };
  }

  const { accessToken } = await requireSession();
  try {
    await adminApi.setUserStatus(accessToken, userId, { status, note });
  } catch (e) {
    if (e instanceof AdminApiError) return { error: e.message };
    return { error: '처리 중 오류가 발생했습니다.' };
  }

  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
  return { ok: true };
}
