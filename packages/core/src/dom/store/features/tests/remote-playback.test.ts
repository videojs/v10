import type { AttachContext } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import type { Media, PlayerTarget } from '../../../media/types';
import { remotePlaybackFeature } from '../remote-playback';

type RemotePlaybackState = ReturnType<typeof remotePlaybackFeature.state>;

function createRemote(overrides: Partial<RemotePlaybackLike> = {}) {
  const target = new EventTarget();
  return Object.assign(target, {
    state: 'disconnected',
    watchAvailability: vi.fn().mockResolvedValue(1),
    cancelWatchAvailability: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

interface RemotePlaybackLike {
  state: string;
  watchAvailability: (callback: (available: boolean) => void) => Promise<number>;
  cancelWatchAvailability?: (id?: number) => Promise<void>;
}

function attach(media: Media) {
  const controller = new AbortController();
  const set = vi.fn();

  remotePlaybackFeature.attach?.({
    target: { media, container: null } as PlayerTarget,
    signal: controller.signal,
    set,
    get: () => ({}) as RemotePlaybackState,
    store: { state: {}, subscribe: () => () => {} },
    reportError: () => {},
  } as AttachContext<PlayerTarget, RemotePlaybackState>);

  return { controller, set };
}

describe('remotePlaybackFeature', () => {
  it('cancels availability watching on abort (W3C path)', () => {
    const remote = createRemote();
    const media = { remote } as unknown as Media;

    const { controller } = attach(media);
    controller.abort();

    expect(remote.cancelWatchAvailability).toHaveBeenCalledOnce();
  });

  it('does not throw on abort when cancelWatchAvailability becomes unavailable', () => {
    // Simulate a custom element whose `remote` resolves to a partial object at
    // detach time — the captured reference must guard the method call.
    const remote = createRemote();
    const media = { remote } as unknown as Media;

    const { controller } = attach(media);

    // The W3C RemotePlayback object loses its method (e.g. inner video torn down).
    (remote as { cancelWatchAvailability?: unknown }).cancelWatchAvailability = undefined;

    expect(() => controller.abort()).not.toThrow();
  });
});
