import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import type { Presentation } from '../../../../media/types';
import { type MediaSourceOwners, type MediaSourceState, setupMediaSource } from '../setup-mediasource';

// Mock the DOM utilities.
// onMediaSourceReadyStateChange fires `onChange('open')` immediately — simulates
// the MediaSource having opened, which is the condition the inner effect waits
// on before writing to owners.
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

function setupSetupMediaSource(initialState: MediaSourceState, initialOwners: MediaSourceOwners) {
  const state = signal<MediaSourceState>(initialState);
  const owners = signal<MediaSourceOwners>(initialOwners);
  const cleanup = setupMediaSource({ state, owners });
  return { state, owners, cleanup };
}

describe('setupMediaSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates MediaSource when mediaElement and presentation.url exist', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});

    owners.set({ ...owners.get(), mediaElement: {} as HTMLMediaElement });
    state.set({
      ...state.get(),
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

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

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});
    const mediaElement = {} as HTMLMediaElement;

    owners.set({ ...owners.get(), mediaElement });
    state.set({
      ...state.get(),
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(attachMediaSource).toHaveBeenCalledWith(mockMediaSource, mediaElement);
    });

    cleanup();
  });

  it('updates owners with mediaSource and mediaSourceReadyState', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const mockMediaSource = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 'open',
    };
    vi.mocked(createMediaSource).mockReturnValue(mockMediaSource as unknown as MediaSource);

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});

    owners.set({ ...owners.get(), mediaElement: {} as HTMLMediaElement });
    state.set({
      ...state.get(),
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(owners.get().mediaSource).toBe(mockMediaSource);
      expect(owners.get().mediaSourceReadyState).toBeDefined();
    });

    cleanup();
  });

  it('does not create MediaSource if mediaElement is missing', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, cleanup } = setupSetupMediaSource({}, {});

    state.set({
      ...state.get(),
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create MediaSource if presentation.url is missing', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { owners, cleanup } = setupSetupMediaSource({}, {});

    owners.set({ ...owners.get(), mediaElement: {} as HTMLMediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create multiple MediaSources (deduplication)', async () => {
    const { createMediaSource } = await import('../../../../media/dom/mse/mediasource-setup');

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});

    owners.set({ ...owners.get(), mediaElement: {} as HTMLMediaElement });
    state.set({
      ...state.get(),
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledTimes(1);
    });

    state.set({
      ...state.get(),
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
