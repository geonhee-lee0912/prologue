'use server';

import { revalidatePath } from 'next/cache';
import { AdminApiError, adminApi } from '@/lib/api';
import { requireSession } from '@/lib/require-session';

export interface DecisionState {
  error?: string;
  ok?: boolean;
}

export async function decidePhotoAction(
  photoId: string,
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim() || undefined;
  if (decision !== 'approve' && decision !== 'reject') {
    return { error: '결정을 선택해주세요.' };
  }
  const { accessToken } = await requireSession();
  try {
    await adminApi.decidePhoto(accessToken, photoId, { decision, reason });
  } catch (e) {
    if (e instanceof AdminApiError) return { error: e.message };
    return { error: '처리 중 오류가 발생했습니다.' };
  }
  revalidatePath('/reviews');
  return { ok: true };
}

export async function decideEmploymentAction(
  userId: string,
  _prev: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const decision = String(formData.get('decision') ?? '');
  const reason = String(formData.get('reason') ?? '').trim() || undefined;
  if (decision !== 'approve' && decision !== 'reject') {
    return { error: '결정을 선택해주세요.' };
  }
  const { accessToken } = await requireSession();
  try {
    await adminApi.decideEmployment(accessToken, userId, { decision, reason });
  } catch (e) {
    if (e instanceof AdminApiError) return { error: e.message };
    return { error: '처리 중 오류가 발생했습니다.' };
  }
  revalidatePath('/reviews');
  return { ok: true };
}
