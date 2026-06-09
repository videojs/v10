import { createStore } from '@videojs/store';
import type { Mock } from 'vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { orientationLockFeature } from '../orientation-lock';

type OrientationMock = {
  lock: Mock<ScreenOrientation['lock']>;
  unlock: Mock<ScreenOrientation['unlock']>;
};

interface WebKitPresentationVideo extends HTMLVideoElement {
  webkitPresentationMode?: string;
}

function stubOrientation(): OrientationMock;
function stubOrientation<Orientation extends Partial<ScreenOrientation>>(orientation: Orientation): Orientation;
function stubOrientation<Orientation extends Partial<ScreenOrientation>>(orientation?: Orientation) {
  const stub =
    orientation ??
    ({
      lock: vi.fn<ScreenOrientation['lock']>(async () => {}),
      unlock: vi.fn<ScreenOrientation['unlock']>(),
    } satisfies OrientationMock);

  vi.stubGlobal('screen', { orientation: stub });
  return stub;
}

function setFullscreenElement(value: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    value,
    writable: true,
    configurable: true,
  });
}

describe('orientationLockFeature', () => {
  afterEach(() => {
    setFullscreenElement(null);
    vi.unstubAllGlobals();
  });

  it('locks landscape by default when fullscreen starts', async () => {
    const orientation = stubOrientation();
    const video = createMockVideo();
    const container = document.createElement('div');

    const store = createStore<PlayerTarget>()(orientationLockFeature);
    store.attach({ media: video, container });

    setFullscreenElement(container);
    document.dispatchEvent(new Event('fullscreenchange'));

    await vi.waitFor(() => {
      expect(orientation.lock).toHaveBeenCalledWith('landscape');
    });
  });

  it('locks the configured orientation type when fullscreen starts', async () => {
    const orientation = stubOrientation();
    const video = createMockVideo();
    const container = document.createElement('div');

    const store = createStore<PlayerTarget>()(orientationLockFeature({ type: 'portrait' }));
    store.attach({ media: video, container });

    setFullscreenElement(container);
    document.dispatchEvent(new Event('fullscreenchange'));

    await vi.waitFor(() => {
      expect(orientation.lock).toHaveBeenCalledWith('portrait');
    });
  });

  it('unlocks when fullscreen exits', async () => {
    const orientation = stubOrientation();
    const video = createMockVideo();
    const container = document.createElement('div');

    const store = createStore<PlayerTarget>()(orientationLockFeature);
    store.attach({ media: video, container });

    setFullscreenElement(container);
    document.dispatchEvent(new Event('fullscreenchange'));

    await vi.waitFor(() => {
      expect(orientation.lock).toHaveBeenCalled();
    });

    await Promise.resolve();
    orientation.unlock.mockClear();

    setFullscreenElement(null);
    document.dispatchEvent(new Event('fullscreenchange'));

    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('unlocks on destroy while fullscreen is active', async () => {
    const orientation = stubOrientation();
    const video = createMockVideo();
    const container = document.createElement('div');

    const store = createStore<PlayerTarget>()(orientationLockFeature);
    store.attach({ media: video, container });

    setFullscreenElement(container);
    document.dispatchEvent(new Event('fullscreenchange'));

    await vi.waitFor(() => {
      expect(orientation.lock).toHaveBeenCalled();
    });

    await Promise.resolve();
    orientation.unlock.mockClear();
    store.destroy();

    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('handles webkit presentation mode changes', async () => {
    const orientation = stubOrientation();
    const video = createMockVideo() as WebKitPresentationVideo;
    video.webkitPresentationMode = 'inline';
    const container = document.createElement('div');

    const store = createStore<PlayerTarget>()(orientationLockFeature);
    store.attach({ media: video, container });

    video.webkitPresentationMode = 'fullscreen';
    video.dispatchEvent(new Event('webkitpresentationmodechanged'));

    await vi.waitFor(() => {
      expect(orientation.lock).toHaveBeenCalledWith('landscape');
    });

    await Promise.resolve();
    orientation.unlock.mockClear();

    video.webkitPresentationMode = 'inline';
    video.dispatchEvent(new Event('webkitpresentationmodechanged'));

    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('does nothing when screen orientation APIs are unsupported', () => {
    const orientation = stubOrientation({});
    const video = createMockVideo();
    const container = document.createElement('div');

    const store = createStore<PlayerTarget>()(orientationLockFeature);
    store.attach({ media: video, container });

    setFullscreenElement(container);
    document.dispatchEvent(new Event('fullscreenchange'));
    setFullscreenElement(null);
    document.dispatchEvent(new Event('fullscreenchange'));

    expect(orientation).toEqual({});
  });

  it('does not unlock when the lock request rejects', async () => {
    const orientation = stubOrientation({
      lock: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      unlock: vi.fn(),
    });
    const video = createMockVideo();
    const container = document.createElement('div');

    const store = createStore<PlayerTarget>()(orientationLockFeature);
    store.attach({ media: video, container });

    setFullscreenElement(container);
    document.dispatchEvent(new Event('fullscreenchange'));

    await vi.waitFor(() => {
      expect(orientation.lock).toHaveBeenCalled();
    });

    setFullscreenElement(null);
    document.dispatchEvent(new Event('fullscreenchange'));

    expect(orientation.unlock).not.toHaveBeenCalled();
  });
});
