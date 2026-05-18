'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { setUserStatusAction, type UserStatusState } from './actions';

const initial: UserStatusState = {};

export function StatusForm({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const bound = setUserStatusAction.bind(null, userId);
  const [state, formAction] = useFormState(bound, initial);
  // 탈퇴/대기 상태에서는 변경 비활성
  const canSuspend = currentStatus === 'active';
  const canReactivate = currentStatus === 'suspended';

  if (!canSuspend && !canReactivate) {
    return (
      <p className="text-sm text-zinc-400">
        현재 상태 ({currentStatus}) 에서는 운영자가 변경할 수 있는 항목이 없어요.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <fieldset className="space-y-2">
        {canSuspend && (
          <RadioOption
            value="suspended"
            title="계정 정지"
            desc="추천/매칭/대화 노출 즉시 중단. User.status=suspended."
            danger
          />
        )}
        {canReactivate && (
          <RadioOption
            value="active"
            title="정지 해제"
            desc="User.status=active 로 복귀."
          />
        )}
      </fieldset>

      <label htmlFor="note" className="mb-1 block text-sm text-zinc-700">
        운영자 메모 (감사 로그)
      </label>
      <textarea
        id="note"
        name="note"
        rows={2}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-ink focus:outline-none"
        placeholder="처리 근거. 사용자에게 노출되지 않습니다."
      />

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          상태가 변경됐어요.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function RadioOption({
  value,
  title,
  desc,
  danger,
}: {
  value: string;
  title: string;
  desc: string;
  danger?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-zinc-200 px-3 py-3 hover:bg-zinc-50">
      <input type="radio" name="status" value={value} required className="mt-0.5 accent-brand-ink" />
      <span>
        <span className={`block text-sm font-medium ${danger ? 'text-red-700' : 'text-brand-ink'}`}>
          {title}
        </span>
        <span className="block text-xs text-zinc-500">{desc}</span>
      </span>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
    >
      {pending ? '처리 중…' : '적용'}
    </button>
  );
}
