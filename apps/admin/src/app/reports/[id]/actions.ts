'use server';

import { revalidatePath } from 'next/cache';
import { AdminApiError, adminApi, type ResolveAction } from '@/lib/api';
import { requireSession } from '@/lib/require-session';

export interface ResolveState {
  error?: string;
  ok?: boolean;
}

export async function resolveReportAction(
  reportId: string,
  _prev: ResolveState,
  formData: FormData,
): Promise<ResolveState> {
  const action = String(formData.get('action') ?? '') as ResolveAction;
  const note = String(formData.get('note') ?? '').trim() || undefined;
  if (!['dismiss', 'resolve_no_action', 'resolve_warned', 'resolve_suspended'].includes(action)) {
    return { error: '처리 옵션을 선택해주세요.' };
  }

  const { accessToken } = await requireSession();
  try {
    await adminApi.resolveReport(accessToken, reportId, { action, note });
  } catch (e) {
    if (e instanceof AdminApiError) return { error: e.message };
    return { error: '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
  }

  revalidatePath(`/reports/${reportId}`);
  revalidatePath('/reports');
  return { ok: true };
}
