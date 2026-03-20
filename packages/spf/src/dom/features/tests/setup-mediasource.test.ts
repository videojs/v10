import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stateToSignal } from '../../../core/signals/bridge';
import { createState } from '../../../core/state/create-state';
import type { Presentation } from '../../../core/types';
import { type MediaSourceOwners, type MediaSourceState, setupMediaSource } from '../setup-mediasource';

// Mock the DOM utilities.
// observeMediaSourceReadyState returns 'open' immediately — simulates the
// MediaSource having opened, which is the condition the inner effect waits on
// before writing to owners.
vi.mock('../../media/mediasource-setup', () => ({
  createMediaSource: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 'open',
  })),
  attachMediaSource: vi.fn(() => ({
    detach: vi.fn(),
  })),
  observeMediaSourceReadyState: vi.fn((_ms: MediaSource, _signal: AbortSignal) => ({
    get: () => 'open' as MediaSource['readyState'],
  })),
}));

function setupSetupMediaSource(initialState: MediaSourceState, initialOwners: MediaSourceOwners) {
  const state = createState<MediaSourceState>(initialState);
  const owners = createState<MediaSourceOwners>(initialOwners);
  const [stateSignal, cleanupState] = stateToSignal(state);
  const [ownersSignal, cleanupOwners] = stateToSignal(owners);
  const cleanupEffect = setupMediaSource({ state: stateSignal, owners: ownersSignal });
  return {
    state,
    owners,
    cleanup: () => {
      cleanupEffect();
      cleanupState();
      cleanupOwners();
    },
  };
}

describe('setupMediaSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates MediaSource when mediaElement and presentation.url exist', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});

    owners.patch({ mediaElement: {} as HTMLMediaElement });
    state.patch({
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledWith({ preferManaged: true });
    });

    cleanup();
  });

  it('attaches MediaSource to mediaElement', async () => {
    const { createMediaSource, attachMediaSource } = await import('../../media/mediasource-setup');

    const mockMediaSource = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 'open',
    };
    vi.mocked(createMediaSource).mockReturnValue(mockMediaSource as unknown as MediaSource);

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});
    const mediaElement = {} as HTMLMediaElement;

    owners.patch({ mediaElement });
    state.patch({
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(attachMediaSource).toHaveBeenCalledWith(mockMediaSource, mediaElement);
    });

    cleanup();
  });

  it('updates owners with mediaSource and mediaSourceReadyState', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const mockMediaSource = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 'open',
    };
    vi.mocked(createMediaSource).mockReturnValue(mockMediaSource as unknown as MediaSource);

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});

    owners.patch({ mediaElement: {} as HTMLMediaElement });
    state.patch({
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(owners.current.mediaSource).toBe(mockMediaSource);
      expect(owners.current.mediaSourceReadyState).toBeDefined();
    });

    cleanup();
  });

  it('does not create MediaSource if mediaElement is missing', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const { state, cleanup } = setupSetupMediaSource({}, {});

    state.patch({
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create MediaSource if presentation.url is missing', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const { owners, cleanup } = setupSetupMediaSource({}, {});

    owners.patch({ mediaElement: {} as HTMLMediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create multiple MediaSources (deduplication)', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const { state, owners, cleanup } = setupSetupMediaSource({}, {});

    owners.patch({ mediaElement: {} as HTMLMediaElement });
    state.patch({
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledTimes(1);
    });

    state.patch({
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
