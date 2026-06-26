import type { ReactNode } from 'react';

import { Button } from '../button';

export type ErrorStateProps = {
  title: ReactNode;
  description?: ReactNode;
  retryLabel?: ReactNode;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title,
  description,
  retryLabel = 'Try again',
  onRetry,
  className = '',
}: ErrorStateProps) {
  const classes = [
    'flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-6 text-start',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="alert" className={classes}>
      <p className="text-base font-medium text-red-900">{title}</p>
      {description ? <p className="text-sm text-red-700">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
