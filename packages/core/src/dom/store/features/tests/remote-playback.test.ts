import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  Media,
  MediaRemotePlaybackCapability,
  MediaRemotePlaybackTarget,
  RemotePlaybackLike,
  RemotePlaybackState,
} from '../../../../core/media/types';
import type { PlayerTarget } from '../../../media/types';
import { HTMLVideoElementHost } from '../../../media/video-host';
import { createMockVideo } from '../../../tests/test-helpers';
import { remotePlaybackFeature } from '../remote-playback';

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'WebKitPlaybackTargetAvailabilityEvent');
});

describe('remotePlaybackFeature', () => {
  it('rebinds remote playback listeners when the remote target changes', async () => {
    const host = new HTMLVideoElementHost();
    const firstRemote = new TestRemotePlayback();
    const secondRemote = new TestRemotePlayback();
    const firstTarget = createRemoteTarget(firstRemote);
    const secondTarget = createRemoteTarget(secondRemote);
    const store = createStore<PlayerTarget>()(remotePlaybackFeature);

    store.attach({ media: host, container: null });

    host.setRemoteMedia(firstTarget);
    await Promise.resolve();

    firstRemote.setAvailability(true);
    expect(store.state.remotePlaybackAvailability).toBe('available');

    host.setRemoteMedia(secondTarget);
    await Promise.resolve();

    expect(firstRemote.cancelWatchAvailability).toHaveBeenCalledWith(1);

    secondRemote.setState('connecting');
    secondRemote.setAvailability(false);

    expect(store.state.remotePlaybackState).toBe('connecting');
    expect(store.state.remotePlaybackAvailability).toBe('unavailable');
  });

  it('uses WebKit AirPlay events when no remote target is set', () => {
    let wireless = false;
    const video = createMockVideo();
    const store = createStore<PlayerTarget>()(remotePlaybackFeature);

    Object.defineProperty(globalThis, 'WebKitPlaybackTargetAvailabilityEvent', {
      value: function WebKitPlaybackTargetAvailabilityEvent() {},
      configurable: true,
    });
    Object.defineProperty(video, 'remote', { value: null, configurable: true });
    Object.defineProperty(video, 'webkitCurrentPlaybackTargetIsWireless', {
      get: () => wireless,
      configurable: true,
    });

    store.attach({ media: video, container: null });

    wireless = true;
    video.dispatchEvent(new Event('webkitcurrentplaybacktargetiswirelesschanged'));

    const availabilityEvent = new Event('webkitplaybacktargetavailabilitychanged') as Event & {
      availability: 'available';
    };
    Object.defineProperty(availabilityEvent, 'availability', { value: 'available' });
    video.dispatchEvent(availabilityEvent);

    expect(store.state.remotePlaybackState).toBe('connected');
    expect(store.state.remotePlaybackAvailability).toBe('available');
  });
});

class TestRemotePlayback extends EventTarget implements RemotePlaybackLike {
  state: RemotePlaybackState = 'disconnected';
  #availabilityCallbacks = new Map<number, RemotePlaybackAvailabilityCallback>();

  prompt = vi.fn(async () => {});
  cancelWatchAvailability = vi.fn(async (id?: number) => {
    if (id === undefined) {
      this.#availabilityCallbacks.clear();
      return;
    }

    this.#availabilityCallbacks.delete(id);
  });

  async watchAvailability(callback: RemotePlaybackAvailabilityCallback): Promise<number> {
    this.#availabilityCallbacks.set(1, callback);
    return 1;
  }

  setState(state: RemotePlaybackState): void {
    this.state = state;
    if (state === 'connected') this.dispatchEvent(new Event('connect'));
    else if (state === 'connecting') this.dispatchEvent(new Event('connecting'));
    else this.dispatchEvent(new Event('disconnect'));
  }

  setAvailability(available: boolean): void {
    for (const callback of this.#availabilityCallbacks.values()) {
      callback(available);
    }
  }
}

function createRemoteTarget(remote: RemotePlaybackLike): MediaRemotePlaybackTarget & MediaRemotePlaybackCapability {
  return Object.assign(new EventTarget(), {
    supported: true,
    active: false,
    remote,
    play: vi.fn(async () => {}),
  }) as Media & MediaRemotePlaybackTarget & MediaRemotePlaybackCapability;
}
