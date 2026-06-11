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
  };
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
});
