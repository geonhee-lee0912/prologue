'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { resolveReportAction, type ResolveState } from './actions';

const initial: ResolveState = {};

export function ResolveForm({ reportId }: { reportId: string }) {
  const boundAction = resolveReportAction.bind(null, reportId);
  const [state, formAction] = useFormState(boundAction, initial);

  return (
    <form action={formAction} className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-medium text-brand-ink">처리</h2>

      <fieldset className="mb-4 space-y-2">
        <Option
          value="dismiss"
          title="무근거로 종결"
          desc="신고 사유가 정책 위반에 해당하지 않음. status=rejected."
        />
        <Option
          value="resolve_no_action"
          title="확인 후 무조치"
          desc="검토했지만 추가 조치는 보류. 추후 누적 시 참고."
        />
        <Option
          value="resolve_warned"
          title="경고 기록"
          desc="피신고자에게 별도 통지 없이 메모로만 경고 사실 기록."
        />
        <Option
          value="resolve_suspended"
          title="계정 정지"
          desc="피신고자 User.status=suspended 로 즉시 전환. 추천/매칭 제외."
          danger
        />
      </fieldset>

      <label htmlFor="note" className="mb-1 block text-sm text-zinc-700">
        운영자 메모 (선택)
      </label>
      <textarea
        id="note"
        name="note"
        rows={3}
        className="mb-3 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-ink focus:outline-none"
        placeholder="내부 기록용 메모. 사용자에게 노출되지 않습니다."
      />

      {state.error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          처리가 완료됐어요.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function Option({
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
      <input
        type="radio"
        name="action"
        value={value}
        required
        className="mt-0.5 accent-brand-ink"
      />
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
      {pending ? '처리 중…' : '처리하기'}
    </button>
  );
}
