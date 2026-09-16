import type { ErrorLike } from '@videojs/media';
import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vite-plus/test';

import type { PlayerTarget } from '../../../player';
import { createMockVideo } from '../../../tests/test-helpers';
import { errorFeature } from '../error';

function createErrorCapableVideo() {
  const video = createMockVideo();

  Object.defineProperty(video, 'error', { value: null, configurable: true });
  return video;
}

describe('errorFeature', () => {
  it('starts without an error', () => {
    const store = createStore<PlayerTarget>()(errorFeature);

    expect(store.state.error).toBeNull();
  });

  it('syncs errors reported by capable media', () => {
    const video = createErrorCapableVideo();
    const error = { code: 3, message: 'Decode failed.' } satisfies ErrorLike;
    const store = createStore<PlayerTarget>()(errorFeature);

    store.attach({ media: video, container: null });
    Object.defineProperty(video, 'error', { value: error, configurable: true });
    video.dispatchEvent(new Event('error'));

    expect(store.state.error).toBe(error);
  });

  it('syncs an existing media error on attach', () => {
    const video = createErrorCapableVideo();
    const error = { code: 4, message: 'Source unsupported.' } satisfies ErrorLike;
    const store = createStore<PlayerTarget>()(errorFeature);

    Object.defineProperty(video, 'error', { value: error, configurable: true });
    store.attach({ media: video, container: null });

    expect(store.state.error).toBe(error);
  });

  it('dismisses the current error', () => {
    const video = createErrorCapableVideo();
    const store = createStore<PlayerTarget>()(errorFeature);

    store.attach({ media: video, container: null });
    Object.defineProperty(video, 'error', {
      value: { code: 2, message: 'Network failed.' } satisfies ErrorLike,
      configurable: true,
    });
    video.dispatchEvent(new Event('error'));

    store.dismissError();

    expect(store.state.error).toBeNull();
  });

  it('clears the current error when the media is emptied', () => {
    const video = createErrorCapableVideo();
    const store = createStore<PlayerTarget>()(errorFeature);

    store.attach({ media: video, container: null });
    Object.defineProperty(video, 'error', {
      value: { code: 4, message: 'Source unsupported.' } satisfies ErrorLike,
      configurable: true,
    });
    video.dispatchEvent(new Event('error'));
    video.dispatchEvent(new Event('emptied'));

    expect(store.state.error).toBeNull();
  });

  it('ignores error events from media without an error capability', () => {
    const media = new EventTarget();
    const store = createStore<PlayerTarget>()(errorFeature);

    // SAFETY: The feature deliberately accepts capability subsets and rejects this one before reading media fields.
    store.attach({ media: media as PlayerTarget['media'], container: null });
    media.dispatchEvent(new Event('error'));

    expect(store.state.error).toBeNull();
  });
});
