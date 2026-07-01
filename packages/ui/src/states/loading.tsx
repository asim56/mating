import type { ReactNode } from 'react';

export type LoadingStateProps = {
  label?: ReactNode;
  className?: string;
};

export function LoadingState({ label = 'Loading…', className = '' }: LoadingStateProps) {
  const classes = ['flex items-center gap-3 text-stone-600', className].filter(Boolean).join(' ');
  return (
    <div role="status" aria-busy="true" className={classes}>
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-700"
      />
      <span>{label}</span>
    </div>
  );
}
