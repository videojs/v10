import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import { type MediaSourceContext, type MediaSourceState, setupMediaSource } from '../setup-mediasource';

// Mock the DOM utilities.
// onMediaSourceReadyStateChange fires `onChange('open')` immediately — simulates
// the MediaSource having opened, which is the condition the inner effect waits
// on before writing to context.
vi.mock('../../../../media/dom/mse/mediasource-setup', () => ({
  createMediaSource: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 'open',
  })),
  attachMediaSource: vi.fn(() => ({
    detach: vi.fn(),
  })),
  onMediaSourceReadyStateChange: vi.fn(
    (_ms: MediaSource, _signal: AbortSignal, onChange: (state: MediaSource['readyState']) => void) => {
      onChange('open');
    }
  ),
}));

function makeState(initial: MediaSourceState = {}): StateSignals<MediaSourceState> {
  return {
    presentation: signal<MediaSourceState['presentation']>(initial.presentation),
    mediaSourceReadyState: signal<MediaSource['readyState'] | undefined>(initial.mediaSourceReadyState),
  };
}

function makeContext(initial: MediaSourceContext = {}): ContextSignals<MediaSourceContext> {
  return {
    mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement),
    mediaSource: signal<MediaSource | undefined>(initial.mediaSource),
  };
}

function setupSetupMediaSource(initialState: MediaSourceState, initialContext: MediaSourceContext) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const cleanup = setupMediaSource({ state, context });
  return { state, context, cleanup };
}

describe('setupMediaSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates MediaSource when mediaElement and presentation.url exist', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, context, cleanup } = setupSetupMediaSource({}, {});

    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set({ url: 'https://example.com/video.m3u8' });

    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledWith({ preferManaged: true });
    });

    cleanup();
  });

  it('attaches MediaSource to mediaElement', async () => {
    const { createMediaSource, attachMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const mockMediaSource = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 'open',
    };
    vi.mocked(createMediaSource).mockReturnValue(mockMediaSource as unknown as MediaSource);

    const { state, context, cleanup } = setupSetupMediaSource({}, {});
    const mediaElement = {} as HTMLMediaElement;

    context.mediaElement.set(mediaElement);
    state.presentation.set({ url: 'https://example.com/video.m3u8' });

    await vi.waitFor(() => {
      expect(attachMediaSource).toHaveBeenCalledWith(mockMediaSource, mediaElement);
    });

    cleanup();
  });

  it('publishes mediaSource on context and mediaSourceReadyState on state', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const mockMediaSource = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 'open',
    };
    vi.mocked(createMediaSource).mockReturnValue(mockMediaSource as unknown as MediaSource);

    const { state, context, cleanup } = setupSetupMediaSource({}, {});

    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set({ url: 'https://example.com/video.m3u8' });

    await vi.waitFor(() => {
      expect(context.mediaSource.get()).toBe(mockMediaSource);
      expect(state.mediaSourceReadyState.get()).toBe('open');
    });

    cleanup();
  });

  it('does not create MediaSource if mediaElement is missing', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, cleanup } = setupSetupMediaSource({}, {});

    state.presentation.set({ url: 'https://example.com/video.m3u8' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create MediaSource if presentation.url is missing', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { context, cleanup } = setupSetupMediaSource({}, {});

    context.mediaElement.set({} as HTMLMediaElement);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create multiple MediaSources (deduplication)', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, context, cleanup } = setupSetupMediaSource({}, {});

    context.mediaElement.set({} as HTMLMediaElement);
    state.presentation.set({ url: 'https://example.com/video.m3u8' });

    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledTimes(1);
    });

    state.presentation.set({ url: 'https://example.com/video.m3u8' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
