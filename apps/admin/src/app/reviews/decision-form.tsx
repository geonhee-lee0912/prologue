'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  decideEmploymentAction,
  decidePhotoAction,
  type DecisionState,
} from './actions';

const initial: DecisionState = {};

export function PhotoDecisionForm({ photoId }: { photoId: string }) {
  const bound = decidePhotoAction.bind(null, photoId);
  const [state, formAction] = useFormState(bound, initial);
  return <DecisionFormBody formAction={formAction} state={state} />;
}

export function EmploymentDecisionForm({ userId }: { userId: string }) {
  const bound = decideEmploymentAction.bind(null, userId);
  const [state, formAction] = useFormState(bound, initial);
  return <DecisionFormBody formAction={formAction} state={state} />;
}

function DecisionFormBody({
  formAction,
  state,
}: {
  formAction: (formData: FormData) => void;
  state: DecisionState;
}) {
  return (
    <form action={formAction} className="space-y-2">
      <textarea
        name="reason"
        rows={2}
        placeholder="반려 사유 / 메모 (선택)"
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs focus:border-brand-ink focus:outline-none"
      />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-emerald-600">처리됨.</p>}
      <div className="flex gap-2">
        <SubmitButton decision="approve" />
        <SubmitButton decision="reject" />
      </div>
    </form>
  );
}

function SubmitButton({ decision }: { decision: 'approve' | 'reject' }) {
  const { pending } = useFormStatus();
  const label = decision === 'approve' ? '승인' : '반려';
  const cls =
    decision === 'approve'
      ? 'bg-brand-ink text-white hover:bg-zinc-800'
      : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50';
  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      disabled={pending}
      className={`rounded px-3 py-1.5 text-xs font-medium ${cls} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? '…' : label}
    </button>
  );
}
