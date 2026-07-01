'use client';

type Props = {
  requestId: string;
  status: string;
};

export function RequestActions({ requestId, status }: Props) {
  const actions: string[] = [];
  if (status === 'Requested') actions.push('accept', 'reject', 'cancel');
  if (status === 'Accepted') actions.push('schedule', 'cancel');
  if (status === 'Scheduled') actions.push('start', 'cancel');
  if (status === 'InProgress') actions.push('complete');
  if (status === 'Completed') actions.push('record');
  if (status === 'RecordGenerated') actions.push('close');

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          className="rounded border px-3 py-1 text-sm capitalize"
          data-request-id={requestId}
          data-action={action}
        >
          {action}
        </button>
      ))}
    </div>
  );
}
