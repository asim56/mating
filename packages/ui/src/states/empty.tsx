import type { ReactNode } from 'react';

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className = '' }: EmptyStateProps) {
  const classes = [
    'flex flex-col items-start gap-2 rounded-lg border border-dashed border-stone-300 p-6 text-start',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="status" className={classes}>
      <p className="text-base font-medium text-stone-900">{title}</p>
      {description ? <p className="text-sm text-stone-600">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
