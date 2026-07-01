import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

import { EmptyState, type EmptyStateProps } from './empty';
import { ErrorState, type ErrorStateProps } from './error';
import { LoadingState, type LoadingStateProps } from './loading';

export { LoadingState, EmptyState, ErrorState };
export type { LoadingStateProps, EmptyStateProps, ErrorStateProps };

/** The four canonical async UI states every data-driven view must handle. */
export type DataStatus = 'loading' | 'empty' | 'error' | 'success';

export type DataStateProps = {
  status: DataStatus;
  children?: ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  error?: ReactNode;
};

/**
 * Declarative switch over the four async UI states. Encourages every view to
 * render an explicit loading/empty/error branch rather than only the happy path.
 */
export function DataState({ status, children, loading, empty, error }: DataStateProps): ReactNode {
  switch (status) {
    case 'loading':
      return loading ?? createElement(LoadingState, {});
    case 'empty':
      return empty ?? createElement(EmptyState, { title: 'Nothing here yet' });
    case 'error':
      return error ?? createElement(ErrorState, { title: 'Something went wrong' });
    case 'success':
    default:
      return createElement(Fragment, null, children);
  }
}
