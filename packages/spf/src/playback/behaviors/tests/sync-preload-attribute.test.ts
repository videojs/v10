import { describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation, MediaElementLike } from '../../../media/types';
import type { PresentationState } from '../resolve-presentation';
import { syncPreloadAttribute } from '../sync-preload-attribute';

interface State {
  preload?: 'auto' | 'metadata' | 'none' | undefined;
}

interface Context {
  mediaElement?: MediaElementLike | undefined;
}

function makeState(initial: State = {}): StateSignals<PresentationState> {
  // syncPreloadAttribute requires a PresentationState shape — provide all keys
  // even though only `preload` is exercised here.
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(undefined),
    preload: signal<'auto' | 'metadata' | 'none' | undefined>(initial.preload),
    playbackInitiated: signal<boolean | undefined>(undefined),
  };
}

function makeContext(initial: Context = {}): ContextSignals<Context> {
  return { mediaElement: signal<MediaElementLike | undefined>(initial.mediaElement) };
}

describe('syncPreloadAttribute', () => {
  it('syncs preload from mediaElement to state', async () => {
    const state = makeState();
    const video = { preload: 'auto' } as MediaElementLike;
    const context = makeContext({ mediaElement: video });

    // Sync should pick up existing mediaElement on first effect fire (synchronous)
    const cleanup = syncPreloadAttribute.setup({ state, context });

    expect(state.preload.get()).toBe('auto');

    cleanup();
  });

  it('does not override preload when mediaElement changes and preload is already set', async () => {
    const state = makeState();
    const video = { preload: 'auto' } as MediaElementLike;
    const context = makeContext({ mediaElement: video });

    const cleanup = syncPreloadAttribute.setup({ state, context });

    expect(state.preload.get()).toBe('auto');

    // Swap to a different mediaElement with a different preload value.
    const updatedVideo = { preload: 'metadata' } as MediaElementLike;
    context.mediaElement.set(updatedVideo);

    await vi.waitFor(() => {
      expect(state.preload.get()).toBe('auto');
    });

    cleanup();
  });

  it('does not loop when mediaElement is absent and preload is unset', () => {
    const state = makeState();
    const context = makeContext();

    const cleanup = syncPreloadAttribute.setup({ state, context });

    expect(state.preload.get()).toBeUndefined();

    cleanup();
  });

  it('does not loop when mediaElement has no preload attribute and preload is unset', () => {
    const state = makeState();
    const context = makeContext({ mediaElement: { preload: '' } as MediaElementLike });

    const cleanup = syncPreloadAttribute.setup({ state, context });

    expect(state.preload.get()).toBeUndefined();

    cleanup();
  });

  it('does not clear preload when mediaElement is removed and preload is already set', async () => {
    const state = makeState({ preload: 'auto' });
    const context = makeContext();

    const cleanup = syncPreloadAttribute.setup({ state, context });

    context.mediaElement.set(undefined);

    expect(state.preload.get()).toBe('auto');

    cleanup();
  });
});
