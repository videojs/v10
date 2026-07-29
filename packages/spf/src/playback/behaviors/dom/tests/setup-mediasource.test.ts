import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import type { Presentation } from '../../../../media/types';
import { type MediaSourceContext, type MediaSourceState, setupMediaSource } from '../setup-mediasource';

// Mock createMediaSource and attachMediaSource while keeping
// waitForMediaSourceOpen real — the real implementation drives off the
// EventTarget-backed mock MediaSource below, so tests can dispatch
// sourceopen / sourceended to control the wait.
vi.mock('../../../../media/dom/mse/mediasource-setup', async () => {
  const actual = await vi.importActual<typeof import('../../../../media/dom/mse/mediasource-setup')>(
    '../../../../media/dom/mse/mediasource-setup'
  );
  return {
    ...actual,
    createMediaSource: vi.fn(),
    attachMediaSource: vi.fn(),
  };
});

function makeMediaSource({ readyState = 'open' as MediaSource['readyState'] } = {}) {
  const target = new EventTarget();
  return Object.create(MediaSource.prototype, {
    readyState: { value: readyState, writable: true },
    addEventListener: { value: target.addEventListener.bind(target) },
    removeEventListener: { value: target.removeEventListener.bind(target) },
    dispatchEvent: { value: target.dispatchEvent.bind(target) },
  }) as MediaSource;
}

function transitionMediaSource(mediaSource: MediaSource, readyState: MediaSource['readyState'], eventType: string) {
  (mediaSource as MediaSource & { readyState: MediaSource['readyState'] }).readyState = readyState;
  mediaSource.dispatchEvent(new Event(eventType));
}

function makeResolvedPresentation(overrides: Partial<Presentation> = {}): Presentation {
  return {
    url: 'https://example.com/video.m3u8',
    id: 'presentation-1',
    selectionSets: [],
    ...overrides,
  } as Presentation;
}

function makeState(initial: MediaSourceState = {}): StateSignals<MediaSourceState> {
  return {
    presentation: signal<MediaSourceState['presentation']>(initial.presentation),
    startPosition: signal<number | undefined>(initial.startPosition),
    resumePlayback: signal<boolean | undefined>(initial.resumePlayback),
    remotePlaybackActive: signal<boolean | undefined>(initial.remotePlaybackActive),
  };
}

/** A media element whose `currentTime`/`paused` tests can stage for snapshot assertions. */
function makeVideo(currentTime = 0, opts: { paused?: boolean } = {}): HTMLMediaElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'currentTime', { value: currentTime, writable: true });
  Object.defineProperty(video, 'paused', { value: opts.paused ?? true, writable: true });
  return video;
}

function makeContext(initial: MediaSourceContext = {}): ContextSignals<MediaSourceContext> {
  return {
    mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement),
    mediaSource: signal<MediaSource | undefined>(initial.mediaSource),
  };
}

function setupSetupMediaSource(initialState: MediaSourceState = {}, initialContext: MediaSourceContext = {}) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const reactor = setupMediaSource.setup({ state, context });
  return { state, context, reactor };
}

describe('setupMediaSource', () => {
  beforeEach(async () => {
    // resetAllMocks (not clearAllMocks) — clears the mockImplementationOnce
    // queue too, so unconsumed `Once` entries from a prior test don't leak
    // into this one.
    vi.resetAllMocks();
    const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');
    // Default mock behavior — open MediaSource, no-op detach. Individual
    // tests override as needed.
    vi.mocked(createMediaSource).mockImplementation(() => makeMediaSource());
    vi.mocked(attachMediaSource).mockImplementation(() => ({ url: 'blob:mock', detach: vi.fn() }));
  });

  it('creates and attaches MediaSource when mediaElement and resolved presentation exist', async () => {
    const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, context, reactor } = setupSetupMediaSource();
    const mediaElement = {} as HTMLMediaElement;

    context.mediaElement.set(mediaElement);
    state.presentation.set(makeResolvedPresentation());

    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledWith({ preferManaged: true });
      expect(attachMediaSource).toHaveBeenCalledTimes(1);
      expect(vi.mocked(attachMediaSource).mock.calls[0]![1]).toBe(mediaElement);
    });

    reactor.destroy();
  });

  it('publishes context.mediaSource only after sourceopen', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const closedMediaSource = makeMediaSource({ readyState: 'closed' });
    vi.mocked(createMediaSource).mockImplementation(() => closedMediaSource);

    const { state, context, reactor } = setupSetupMediaSource();
    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set(makeResolvedPresentation());

    // Behavior is awaiting sourceopen — context.mediaSource not yet set.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(context.mediaSource.get()).toBeUndefined();

    // MediaSource opens — publish proceeds.
    transitionMediaSource(closedMediaSource, 'open', 'sourceopen');

    await vi.waitFor(() => {
      expect(context.mediaSource.get()).toBe(closedMediaSource);
    });

    reactor.destroy();
  });

  it('does not publish if MediaSource transitions to ended before opening', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const closedMediaSource = makeMediaSource({ readyState: 'closed' });
    vi.mocked(createMediaSource).mockImplementation(() => closedMediaSource);

    const { state, context, reactor } = setupSetupMediaSource();
    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set(makeResolvedPresentation());

    // Race: readyState jumps straight to 'ended' (e.g. premature endOfStream).
    transitionMediaSource(closedMediaSource, 'ended', 'sourceended');

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(context.mediaSource.get()).toBeUndefined();

    reactor.destroy();
  });

  it('does not create MediaSource if mediaElement is missing', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, reactor } = setupSetupMediaSource();
    state.presentation.set(makeResolvedPresentation());

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createMediaSource).not.toHaveBeenCalled();

    reactor.destroy();
  });

  it('does not create MediaSource if presentation is unresolved', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, context, reactor } = setupSetupMediaSource();
    context.mediaElement.set({} as HTMLMediaElement);
    // Unresolved presentation — has url but no id / selectionSets.
    state.presentation.set({ url: 'https://example.com/video.m3u8' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createMediaSource).not.toHaveBeenCalled();

    reactor.destroy();
  });

  it('detaches and clears context.mediaSource on source unload', async () => {
    const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const mockMediaSource = makeMediaSource();
    const detach = vi.fn();
    vi.mocked(createMediaSource).mockImplementation(() => mockMediaSource);
    vi.mocked(attachMediaSource).mockImplementation(() => ({ url: 'blob:mock', detach }));

    const { state, context, reactor } = setupSetupMediaSource();
    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set(makeResolvedPresentation());

    await vi.waitFor(() => {
      expect(context.mediaSource.get()).toBe(mockMediaSource);
    });

    // Source unload — clears presentation.
    state.presentation.set(undefined);

    await vi.waitFor(() => {
      expect(detach).toHaveBeenCalledTimes(1);
      expect(context.mediaSource.get()).toBeUndefined();
    });

    reactor.destroy();
  });

  it('detaches old MediaSource and attaches new one on source replace', async () => {
    const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const firstMediaSource = makeMediaSource();
    const secondMediaSource = makeMediaSource();
    const firstDetach = vi.fn();
    const secondDetach = vi.fn();
    vi.mocked(createMediaSource)
      .mockImplementationOnce(() => firstMediaSource)
      .mockImplementationOnce(() => secondMediaSource);
    vi.mocked(attachMediaSource)
      .mockImplementationOnce(() => ({ url: 'blob:1', detach: firstDetach }))
      .mockImplementationOnce(() => ({ url: 'blob:2', detach: secondDetach }));

    const { state, context, reactor } = setupSetupMediaSource();
    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set(makeResolvedPresentation({ url: 'https://example.com/a.m3u8' }));

    await vi.waitFor(() => {
      expect(context.mediaSource.get()).toBe(firstMediaSource);
    });

    // Source replace: resolver routes presentation back through unresolved
    // on URL change, so `setupMediaSource` sees the unresolved intermediate
    // and exits its positive state (firing detach + clear), then re-enters
    // when the new resolved presentation arrives. The two `.set()` calls
    // need to be observed across separate microtask flushes — back-to-back
    // synchronous writes get batched and the watcher only sees the final
    // state, collapsing through the unresolved intermediate.
    state.presentation.set({ url: 'https://example.com/b.m3u8' });
    await vi.waitFor(() => {
      expect(firstDetach).toHaveBeenCalledTimes(1);
      expect(context.mediaSource.get()).toBeUndefined();
    });

    state.presentation.set(makeResolvedPresentation({ url: 'https://example.com/b.m3u8' }));
    await vi.waitFor(() => {
      expect(context.mediaSource.get()).toBe(secondMediaSource);
    });

    reactor.destroy();
  });

  it('detaches and clears context.mediaSource on destroy while attached', async () => {
    const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const mockMediaSource = makeMediaSource();
    const detach = vi.fn();
    vi.mocked(createMediaSource).mockImplementation(() => mockMediaSource);
    vi.mocked(attachMediaSource).mockImplementation(() => ({ url: 'blob:mock', detach }));

    const { state, context, reactor } = setupSetupMediaSource();
    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set(makeResolvedPresentation());

    await vi.waitFor(() => {
      expect(context.mediaSource.get()).toBe(mockMediaSource);
    });

    reactor.destroy();

    expect(detach).toHaveBeenCalledTimes(1);
    expect(context.mediaSource.get()).toBeUndefined();
  });

  it('does not re-attach on internal presentation updates', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, context, reactor } = setupSetupMediaSource();
    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set(makeResolvedPresentation({ duration: 60 }));

    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledTimes(1);
    });

    // Internal update — same URL, presentation stays resolved (different
    // object identity, but state machine derives the same state name).
    state.presentation.set(makeResolvedPresentation({ duration: 120 }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(createMediaSource).toHaveBeenCalledTimes(1);

    reactor.destroy();
  });

  describe('liveness recovery', () => {
    it('recycles with a fresh MediaSource when the UA closes the attached one', async () => {
      const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

      const first = makeMediaSource();
      const second = makeMediaSource();
      const firstDetach = vi.fn();
      const secondDetach = vi.fn();
      vi.mocked(createMediaSource)
        .mockImplementationOnce(() => first)
        .mockImplementationOnce(() => second);
      vi.mocked(attachMediaSource)
        .mockImplementationOnce(() => ({ url: 'blob:first', detach: firstDetach }))
        .mockImplementationOnce(() => ({ url: 'blob:second', detach: secondDetach }));

      const { state, context, reactor } = setupSetupMediaSource();
      context.mediaElement.set(makeVideo());
      state.presentation.set(makeResolvedPresentation());
      await vi.waitFor(() => expect(context.mediaSource.get()).toBe(first));

      // Safari closes the MMS out from under the engine (AirPlay handoff
      // return, eviction). A closed MediaSource can never reopen — the
      // behavior must detach it and rebuild a fresh one for the same source.
      transitionMediaSource(first, 'closed', 'sourceclose');

      await vi.waitFor(() => {
        expect(firstDetach).toHaveBeenCalledTimes(1);
        expect(context.mediaSource.get()).toBe(second);
      });

      reactor.destroy();
    });

    it('snapshots element.currentTime + playing state on a recovery exit', async () => {
      const mediaElement = makeVideo(42.5, { paused: false });
      const { state, context, reactor } = setupSetupMediaSource();
      context.mediaElement.set(mediaElement);
      state.presentation.set(makeResolvedPresentation());
      await vi.waitFor(() => expect(context.mediaSource.get()).toBeDefined());
      const first = context.mediaSource.get()!;

      transitionMediaSource(first, 'closed', 'sourceclose');

      // Recovery detach skips its load() reset, so the element still carries
      // the playback state; the rebuild's entry snapshots it before the
      // fresh attach resets the element — applyStartPosition then restores
      // position AND playing state on the rebuilt source.
      await vi.waitFor(() => {
        expect(state.startPosition.get()).toBe(42.5);
        expect(state.resumePlayback.get()).toBe(true);
      });

      reactor.destroy();
    });

    it('snapshots resumePlayback=false when the element was paused at recovery', async () => {
      const mediaElement = makeVideo(42.5, { paused: true });
      const { state, context, reactor } = setupSetupMediaSource();
      context.mediaElement.set(mediaElement);
      state.presentation.set(makeResolvedPresentation());
      await vi.waitFor(() => expect(context.mediaSource.get()).toBeDefined());
      const first = context.mediaSource.get()!;

      transitionMediaSource(first, 'closed', 'sourceclose');

      await vi.waitFor(() => {
        expect(state.startPosition.get()).toBe(42.5);
        // A paused element must come back paused — no surprise autoplay.
        expect(state.resumePlayback.get()).toBe(false);
      });

      reactor.destroy();
    });

    it('does not snapshot on an ordinary source change', async () => {
      const mediaElement = makeVideo(42.5, { paused: false });
      const { state, context, reactor } = setupSetupMediaSource();
      context.mediaElement.set(mediaElement);
      state.presentation.set(makeResolvedPresentation());
      await vi.waitFor(() => expect(context.mediaSource.get()).toBeDefined());

      // Source replacement routes through unresolved — a new source must
      // start at its own beginning, not inherit the old position/play state.
      state.presentation.set({ url: 'https://example.com/next.m3u8' });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(state.startPosition.get()).toBeUndefined();
      expect(state.resumePlayback.get()).toBeUndefined();

      reactor.destroy();
    });

    it('detaches on close during a session, defers the rebuild to its falling edge', async () => {
      const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

      const first = makeMediaSource();
      const second = makeMediaSource();
      const firstDetach = vi.fn();
      vi.mocked(createMediaSource)
        .mockImplementationOnce(() => first)
        .mockImplementationOnce(() => second);
      vi.mocked(attachMediaSource)
        .mockImplementationOnce(() => ({ url: 'blob:first', detach: firstDetach }))
        .mockImplementationOnce(() => ({ url: 'blob:second', detach: vi.fn() }));

      const { state, context, reactor } = setupSetupMediaSource();
      const mediaElement = makeVideo(12, { paused: false });
      context.mediaElement.set(mediaElement);
      state.presentation.set(makeResolvedPresentation());
      await vi.waitFor(() => expect(context.mediaSource.get()).toBe(first));

      // AirPlay engaged: the receiver owns playback. Safari closes the MMS —
      // the corpse detaches right away (the ordinary cascade stops the MSE
      // pipeline), but no rebuild may run under the live session: attaching
      // would load() out from under the receiver.
      state.remotePlaybackActive.set(true);
      transitionMediaSource(first, 'closed', 'sourceclose');

      await vi.waitFor(() => {
        expect(firstDetach).toHaveBeenCalledTimes(1);
        expect(context.mediaSource.get()).toBeUndefined();
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(createMediaSource).toHaveBeenCalledTimes(1);
      // No mid-session restore commands: the element (mirroring the
      // receiver) is the source of truth until the session ends.
      expect(state.startPosition.get()).toBeUndefined();

      // Session ends: the element still mirrors the receiver's final state —
      // the rebuild's entry snapshots it before the fresh attach resets it.
      (mediaElement as unknown as { currentTime: number }).currentTime = 87;
      state.remotePlaybackActive.set(false);

      await vi.waitFor(() => {
        expect(state.startPosition.get()).toBe(87);
        expect(state.resumePlayback.get()).toBe(true);
        expect(context.mediaSource.get()).toBe(second);
      });

      reactor.destroy();
    });
  });
});
