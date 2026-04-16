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

  it('errors when composing features with conflicting required state types', () => {
    const expectsNumber = (_deps: { state: Signal<{ value: number }> }) => {};
    const expectsString = (_deps: { state: Signal<{ value: string }> }) => {};

    // @ts-expect-error — features have incompatible state: { value: number } vs { value: string }
    createPlaybackEngine([expectsNumber, expectsString]);
  });

  it('errors when composing features with conflicting optional state types', () => {
    const expectsNumber = (_deps: { state: Signal<{ count?: number }> }) => {};
    const expectsString = (_deps: { state: Signal<{ count?: string }> }) => {};

    // @ts-expect-error — features have incompatible state: { count?: number } vs { count?: string }
    createPlaybackEngine([expectsNumber, expectsString]);
  });

  it('errors when composing features with conflicting config types', () => {
    const expectsNumber = (_deps: { config: { interval?: number } }) => {};
    const expectsString = (_deps: { config: { interval?: string } }) => {};

    // @ts-expect-error — features have incompatible config: { interval?: number } vs { interval?: string }
    createPlaybackEngine([expectsNumber, expectsString]);
  });

  it('errors when composing features with incompatible owners class types', () => {
    const expectsCanvas = (_deps: { owners: Signal<{ el?: HTMLCanvasElement }> }) => {};
    const expectsVideo = (_deps: { owners: Signal<{ el?: HTMLVideoElement }> }) => {};

    // @ts-expect-error — neither HTMLCanvasElement nor HTMLVideoElement extends the other
    createPlaybackEngine([expectsCanvas, expectsVideo]);
  });

  // =========================================================================
  // Non-conflicts — features that omit channels should compose freely
  // =========================================================================

  it('allows composing features with owners in a subtype relationship', () => {
    const expectsElement = (_deps: { owners: Signal<{ el?: HTMLElement }> }) => {};
    const expectsVideo = (_deps: { owners: Signal<{ el?: HTMLVideoElement }> }) => {};

    // No error — HTMLVideoElement extends HTMLElement
    createPlaybackEngine([expectsElement, expectsVideo]);
  });

  it('allows composing features that omit owners', () => {
    const stateOnly = (_deps: { state: Signal<{ count?: number }> }) => {};
    const withOwners = (_deps: { state: Signal<{ count?: number }>; owners: Signal<{ el?: HTMLElement }> }) => {};

    // No error — omitting owners is not a conflict
    createPlaybackEngine([stateOnly, withOwners]);
  });

  it('allows composing features that omit state', () => {
    const configOnly = (_deps: { config: { interval?: number } }) => {};
    const withState = (_deps: { state: Signal<{ count?: number }>; config: { interval?: number } }) => {};

    // No error — omitting state is not a conflict
    createPlaybackEngine([configOnly, withState]);
  });

  it('allows composing features that omit config', () => {
    const stateOnly = (_deps: { state: Signal<{ count?: number }> }) => {};
    const withConfig = (_deps: { state: Signal<{ count?: number }>; config: { interval?: number } }) => {};

    // No error — omitting config is not a conflict
    createPlaybackEngine([stateOnly, withConfig]);
  });

  it('allows composing features where each omits different channels', () => {
    const onlyState = (_deps: { state: Signal<{ count?: number }> }) => {};
    const onlyOwners = (_deps: { owners: Signal<{ el?: HTMLElement }> }) => {};
    const onlyConfig = (_deps: { config: { interval?: number } }) => {};

    // No error — features with disjoint channels don't conflict
    createPlaybackEngine([onlyState, onlyOwners, onlyConfig]);
  });

  // =========================================================================
  // Resetting optional fields to undefined
  // =========================================================================

  it('allows resetting optional state fields to undefined', () => {
    // Features declare { count?: number } — the engine allows resetting to
    // undefined without requiring the feature to declare | undefined.
    const feature = (_deps: { state: Signal<{ count?: number }> }) => {};
    const engine = createPlaybackEngine([feature]);

    // No error — optional fields can be reset to undefined
    update(engine.state, { count: undefined });
  });

  it('allows resetting optional owners fields to undefined', () => {
    const feature = (_deps: { owners: Signal<{ el?: HTMLElement }> }) => {};
    const engine = createPlaybackEngine([feature]);

    // No error — clearing an owner (e.g. on source switch)
    update(engine.owners, { el: undefined });
  });
});
