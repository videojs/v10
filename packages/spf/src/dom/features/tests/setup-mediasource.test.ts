import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { Presentation } from '../../../core/types';
import {
  canSetup,
  type MediaSourceOwners,
  type MediaSourceState,
  setupMediaSource,
  shouldSetup,
} from '../setup-mediasource';

// Mock the DOM utilities
vi.mock('../../media/mediasource-setup', () => ({
  createMediaSource: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 'closed',
  })),
  attachMediaSource: vi.fn(() => ({
    detach: vi.fn(),
  })),
  waitForSourceOpen: vi.fn(() => Promise.resolve()),
}));

describe('canSetup', () => {
  it('returns true when mediaElement and presentation.url exist', () => {
    const state: MediaSourceState = {
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    };
    const owners: MediaSourceOwners = {
      mediaElement: {} as HTMLMediaElement,
    };

    expect(canSetup(state, owners)).toBe(true);
  });

  it('returns false when mediaElement is missing', () => {
    const state: MediaSourceState = {
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    };
    const owners: MediaSourceOwners = {};

    expect(canSetup(state, owners)).toBe(false);
  });

  it('returns false when presentation is missing', () => {
    const state: MediaSourceState = {};
    const owners: MediaSourceOwners = {
      mediaElement: {} as HTMLMediaElement,
    };

    expect(canSetup(state, owners)).toBe(false);
  });

  it('returns false when presentation.url is missing', () => {
    const state: MediaSourceState = {
      presentation: {} as Presentation,
    };
    const owners: MediaSourceOwners = {
      mediaElement: {} as HTMLMediaElement,
    };

    expect(canSetup(state, owners)).toBe(false);
  });

  it('returns false when preload is "none" and playback has not been initiated', () => {
    const state: MediaSourceState = {
      preload: 'none',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    };
    const owners: MediaSourceOwners = { mediaElement: {} as HTMLMediaElement };

    expect(canSetup(state, owners)).toBe(false);
  });

  it('returns true when preload is "none" but playbackInitiated is true', () => {
    const state: MediaSourceState = {
      preload: 'none',
      playbackInitiated: true,
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    };
    const owners: MediaSourceOwners = { mediaElement: {} as HTMLMediaElement };

    expect(canSetup(state, owners)).toBe(true);
  });
});

describe('shouldSetup', () => {
  it('returns true when mediaSource does not exist', () => {
    const state: MediaSourceState = {};
    const owners: MediaSourceOwners = {
      mediaElement: {} as HTMLMediaElement,
    };

    expect(shouldSetup(state, owners)).toBe(true);
  });

  it('returns false when mediaSource already exists', () => {
    const state: MediaSourceState = {};
    const owners: MediaSourceOwners = {
      mediaElement: {} as HTMLMediaElement,
      mediaSource: {} as MediaSource,
    };

    expect(shouldSetup(state, owners)).toBe(false);
  });
});

describe('setupMediaSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates MediaSource when mediaElement and presentation.url exist', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const state = createState<MediaSourceState>({});
    const owners = createState<MediaSourceOwners>({});

    const cleanup = setupMediaSource({ state, owners });

    // Set up conditions
    owners.patch({ mediaElement: {} as HTMLMediaElement });
    state.patch({
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    // Wait for async operation
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
      readyState: 'closed',
    };
    vi.mocked(createMediaSource).mockReturnValue(mockMediaSource as unknown as MediaSource);

    const state = createState<MediaSourceState>({});
    const owners = createState<MediaSourceOwners>({});
    const mediaElement = {} as HTMLMediaElement;

    const cleanup = setupMediaSource({ state, owners });

    owners.patch({ mediaElement });
    state.patch({
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(attachMediaSource).toHaveBeenCalledWith(mockMediaSource, mediaElement);
    });

    cleanup();
  });

  it('waits for sourceopen event', async () => {
    const { waitForSourceOpen } = await import('../../media/mediasource-setup');

    const state = createState<MediaSourceState>({});
    const owners = createState<MediaSourceOwners>({});

    const cleanup = setupMediaSource({ state, owners });

    owners.patch({ mediaElement: {} as HTMLMediaElement });
    state.patch({
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      expect(waitForSourceOpen).toHaveBeenCalled();
    });

    cleanup();
  });

  it('updates owners with mediaSource reference', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const mockMediaSource = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 'closed',
    };
    vi.mocked(createMediaSource).mockReturnValue(mockMediaSource as unknown as MediaSource);

    const state = createState<MediaSourceState>({});
    const owners = createState<MediaSourceOwners>({});

    const cleanup = setupMediaSource({ state, owners });

    owners.patch({ mediaElement: {} as HTMLMediaElement });
    state.patch({
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    await vi.waitFor(() => {
      const currentOwners = owners.current;
      expect(currentOwners.mediaSource).toBe(mockMediaSource);
    });

    cleanup();
  });

  it('does not create MediaSource if mediaElement is missing', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const state = createState<MediaSourceState>({});
    const owners = createState<MediaSourceOwners>({});

    const cleanup = setupMediaSource({ state, owners });

    state.patch({
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    // Wait a bit to ensure no async operations occur
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create MediaSource if presentation.url is missing', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const state = createState<MediaSourceState>({});
    const owners = createState<MediaSourceOwners>({});

    const cleanup = setupMediaSource({ state, owners });

    owners.patch({ mediaElement: {} as HTMLMediaElement });

    // Wait a bit to ensure no async operations occur
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).not.toHaveBeenCalled();

    cleanup();
  });

  it('does not create multiple MediaSources (deduplication)', async () => {
    const { createMediaSource } = await import('../../media/mediasource-setup');

    const state = createState<MediaSourceState>({});
    const owners = createState<MediaSourceOwners>({});

    const cleanup = setupMediaSource({ state, owners });

    owners.patch({ mediaElement: {} as HTMLMediaElement });
    state.patch({
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    // Wait for first creation
    await vi.waitFor(() => {
      expect(createMediaSource).toHaveBeenCalledTimes(1);
    });

    // Trigger another update (same data)
    state.patch({
      preload: 'auto',
      presentation: { url: 'https://example.com/video.m3u8' } as Presentation,
    });

    // Wait a bit to ensure no additional calls
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(createMediaSource).toHaveBeenCalledTimes(1);

    cleanup();
  });
});
