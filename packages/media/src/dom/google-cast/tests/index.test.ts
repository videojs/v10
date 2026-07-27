import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addComponent } from '../../media-host';
import { HTMLVideoElementHost } from '../../video-host';
import { GoogleCast } from '../index';

const mocks = vi.hoisted(() => {
  class FakeRemote extends EventTarget {
    state: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  }

  class FakeProvider {
    static instances: FakeProvider[] = [];

    remote = new FakeRemote();
    currentTime = 42;
    muted = false;
    load = vi.fn();
    attach = vi.fn();
    detach = vi.fn();
    destroy = vi.fn();

    constructor(public config: unknown) {
      FakeProvider.instances.push(this);
    }
  }

  return { FakeProvider };
});

vi.mock('../google-cast-provider', () => ({
  GoogleCastProvider: mocks.FakeProvider,
}));

function setup() {
  const host = new HTMLVideoElementHost();
  const video = document.createElement('video');
  host.attach(video);

  const googleCast = new GoogleCast();
  addComponent(host, googleCast);

  const provider = mocks.FakeProvider.instances.at(-1)!;
  return { host, video, googleCast, provider };
}

function connect(provider: InstanceType<typeof mocks.FakeProvider>) {
  provider.remote.state = 'connected';
  provider.remote.dispatchEvent(new Event('connect'));
}

function disconnect(provider: InstanceType<typeof mocks.FakeProvider>) {
  provider.remote.state = 'disconnected';
  provider.remote.dispatchEvent(new Event('disconnect'));
}

beforeEach(() => {
  // `requiresCastFramework()` requires a Chromium-like environment.
  vi.stubGlobal('chrome', {});
  mocks.FakeProvider.instances.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GoogleCast', () => {
  describe('override swap on connect/disconnect', () => {
    it('routes host reads to the target while disconnected', () => {
      const { host, googleCast, provider } = setup();

      expect(googleCast.targetOverride).not.toBe(provider);
      expect(host.currentTime).toBe(0);
    });

    it('swaps the target override to the provider on connect', () => {
      const { host, googleCast, provider } = setup();

      connect(provider);

      expect(googleCast.targetOverride).toBe(provider);
      expect(host.currentTime).toBe(42);
    });

    it('restores the remote-only override on disconnect', () => {
      const { host, googleCast, provider } = setup();

      connect(provider);
      disconnect(provider);

      expect(googleCast.targetOverride).not.toBe(provider);
      expect(host.currentTime).toBe(0);
      // The override still exposes `remote` through the provider accessor.
      expect(host.remote).toBe(provider.remote);
    });

    it('routes property writes to the provider while connected', () => {
      const { host, video, provider } = setup();

      connect(provider);
      host.muted = true;

      expect(provider.muted).toBe(true);
      expect(video.muted).toBe(false);
    });

    it('routes property writes to the target after disconnect', () => {
      const { host, video, provider } = setup();

      connect(provider);
      disconnect(provider);
      host.muted = true;

      expect(provider.muted).toBe(false);
      expect(video.muted).toBe(true);
    });
  });

  describe('cast prop changes', () => {
    it('reloads the media when a cast prop changes while connected', () => {
      const { googleCast, provider } = setup();

      connect(provider);
      googleCast.src = 'https://example.com/stream.m3u8';

      expect(provider.load).toHaveBeenCalledTimes(1);
    });

    it('does not reload the media while disconnected', () => {
      const { googleCast, provider } = setup();

      googleCast.src = 'https://example.com/stream.m3u8';

      expect(provider.load).not.toHaveBeenCalled();
    });
  });
});
