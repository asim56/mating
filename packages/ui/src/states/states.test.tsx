import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidElement, type ReactNode } from 'react';

import { Button } from '../button';
import { EmptyState } from './empty';
import { ErrorState } from './error';
import { LoadingState } from './loading';
import { DataState } from './index';

type AnyElement = { type: unknown; props: Record<string, unknown> };

function collectText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join(' ');
  }
  if (isValidElement(node)) {
    return collectText((node.props as { children?: ReactNode }).children);
  }
  return '';
}

function findByType(node: ReactNode, type: unknown): AnyElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByType(child, type);
      if (found) return found;
    }
    return null;
  }
  if (isValidElement(node)) {
    const element = node as unknown as AnyElement;
    if (element.type === type) return element;
    return findByType((node.props as { children?: ReactNode }).children, type);
  }
  return null;
}

test('LoadingState exposes a status role and its label', () => {
  const element = LoadingState({ label: 'Fetching…' }) as unknown as AnyElement;
  assert.equal(element.props.role, 'status');
  assert.equal(element.props['aria-busy'], 'true');
  assert.match(collectText(element as unknown as ReactNode), /Fetching…/);
});

test('EmptyState renders title and description', () => {
  const element = EmptyState({ title: 'No animals', description: 'Add one to begin' });
  const text = collectText(element);
  assert.match(text, /No animals/);
  assert.match(text, /Add one to begin/);
});

test('ErrorState renders a retry Button wired to onRetry', () => {
  let retried = false;
  const onRetry = () => {
    retried = true;
  };
  const element = ErrorState({ title: 'Failed', onRetry, retryLabel: 'Retry now' });

  assert.equal((element as unknown as AnyElement).props.role, 'alert');
  const button = findByType(element, Button);
  assert.ok(button, 'expected a retry Button');
  assert.equal(button?.props.onClick, onRetry);

  (button?.props.onClick as () => void)();
  assert.equal(retried, true);
});

test('ErrorState omits the retry Button when no handler is provided', () => {
  const element = ErrorState({ title: 'Failed' });
  assert.equal(findByType(element, Button), null);
});

test('DataState switches across the four async states', () => {
  assert.equal((DataState({ status: 'loading' }) as unknown as AnyElement).type, LoadingState);
  assert.equal((DataState({ status: 'empty' }) as unknown as AnyElement).type, EmptyState);
  assert.equal((DataState({ status: 'error' }) as unknown as AnyElement).type, ErrorState);

  const success = DataState({ status: 'success', children: 'Loaded content' });
  assert.match(collectText(success), /Loaded content/);
});
