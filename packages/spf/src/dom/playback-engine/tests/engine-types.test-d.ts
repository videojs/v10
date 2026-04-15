import { describe, it } from 'vitest';
import { effect } from '../../../core/signals/effect';
import type { Signal } from '../../../core/signals/primitives';
import { update } from '../../../core/signals/primitives';
import { createPlaybackEngine } from '../engine';

// =============================================================================
// Test features
// =============================================================================

function counter({ state, config }: { state: Signal<{ count?: number }>; config: { interval?: number } }) {
  const interval = setInterval(() => {
    update(state, { count: (state.get().count ?? 0) + 1 });
  }, config.interval ?? 1000);
  return () => clearInterval(interval);
}

function render({
  state,
  owners,
  config,
}: {
  state: Signal<{ count?: number }>;
  owners: Signal<{ renderElement?: HTMLElement }>;
  config: { defaultText?: string };
}) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

// =============================================================================
// Type error enforcement
// =============================================================================

describe('createPlaybackEngine type errors', () => {
  it('errors when update() is called with a wrong type on engine.state', () => {
    const engine = createPlaybackEngine([counter]);
    // @ts-expect-error — count expects number, not string
    update(engine.state, { count: 'not a number' });
  });

  it('errors when set() is called with a wrong type on engine.state', () => {
    const engine = createPlaybackEngine([counter]);
    // @ts-expect-error — state expects { count?: number }, not { count: string }
    engine.state.set({ count: 'not a number' });
  });

  it('errors when update() uses a key not in the inferred state', () => {
    const engine = createPlaybackEngine([counter]);
    // @ts-expect-error — 'unknown' is not a key of { count?: number }
    update(engine.state, { unknown: true });
  });

  it('errors when initialState has wrong types', () => {
    // @ts-expect-error — count expects number, not string
    createPlaybackEngine([counter], { initialState: { count: 'wrong' } });
  });

  it('errors when initialOwners has wrong types', () => {
    // @ts-expect-error — renderElement expects HTMLElement, not number
    createPlaybackEngine([render], { initialOwners: { renderElement: 42 } });
  });

  it('errors when config has wrong types', () => {
    // @ts-expect-error — interval expects number, not string
    createPlaybackEngine([counter], { config: { interval: 'fast' } });
  });

  it('errors when conflicting features produce a never field and you try to write it', () => {
    const expectsNumber = (_deps: { state: Signal<{ value: number }> }) => {};
    const expectsString = (_deps: { state: Signal<{ value: string }> }) => {};

    const engine = createPlaybackEngine([expectsNumber, expectsString]);

    // The intersection of { value: number } & { value: string } is { value: never }.
    // Attempting to write any concrete value to a never field is a type error.
    // @ts-expect-error — value is never (conflicting features), cannot assign number
    update(engine.state, { value: 42 });
  });
});
