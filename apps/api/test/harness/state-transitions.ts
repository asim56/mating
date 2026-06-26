import assert from 'node:assert/strict';

/**
 * A transition map: each state maps to the set of states it may move to.
 * Reused by every domain state machine (breeding requests, payments, etc.).
 */
export type TransitionMap<TState extends string> = Record<TState, readonly TState[]>;

export function canTransition<TState extends string>(
  map: TransitionMap<TState>,
  from: TState,
  to: TState,
): boolean {
  return map[from]?.includes(to) ?? false;
}

/**
 * Asserts allowed/forbidden transitions against a map. Domain modules pass their
 * canonical transition map and the matrix of expectations.
 */
export function assertTransitions<TState extends string>(options: {
  map: TransitionMap<TState>;
  allowed: Array<[TState, TState]>;
  forbidden: Array<[TState, TState]>;
}): void {
  for (const [from, to] of options.allowed) {
    assert.equal(
      canTransition(options.map, from, to),
      true,
      `expected ${from} -> ${to} to be allowed`,
    );
  }
  for (const [from, to] of options.forbidden) {
    assert.equal(
      canTransition(options.map, from, to),
      false,
      `expected ${from} -> ${to} to be forbidden`,
    );
  }
}
