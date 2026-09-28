import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vite-plus/test';

import type { PlayerTarget } from '../../../player';
import { createMockVideo } from '../../../tests/test-helpers';
import { sourceFeature } from '../source';

describe('sourceFeature', () => {
  describe('attach', () => {
    it('syncs source state on attach', () => {
      const video = createMockVideo({
        currentSrc: 'https://example.com/video.mp4',
        src: 'https://example.com/video.mp4',
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const store = createStore<PlayerTarget>()(sourceFeature);

      store.attach({ media: video, container: null });

      expect(store.state.currentSrc).toBe('https://example.com/video.mp4');
      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_ENOUGH_DATA);
    });

    it('starts empty before attach', () => {
      const store = createStore<PlayerTarget>()(sourceFeature);

      expect(store.state.currentSrc).toBe('');
      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_NOTHING);
    });

    it('reports an empty currentSrc when no source is set', () => {
      // Note: Don't set src at all - setting src="" resolves to page URL
      const video = document.createElement('video');

      Object.defineProperty(video, 'currentSrc', { value: '', writable: false });
      Object.defineProperty(video, 'readyState', { value: HTMLMediaElement.HAVE_NOTHING, writable: false });

      const store = createStore<PlayerTarget>()(sourceFeature);

      store.attach({ media: video, container: null });

      expect(store.state.currentSrc).toBe('');
      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_NOTHING);
    });

    it('follows readyState as it rises while loading', () => {
      const video = createMockVideo({
        currentSrc: '',
        readyState: HTMLMediaElement.HAVE_NOTHING,
      });

      const store = createStore<PlayerTarget>()(sourceFeature);

      store.attach({ media: video, container: null });

      setReadyState(video, HTMLMediaElement.HAVE_METADATA);
      video.dispatchEvent(new Event('loadedmetadata'));

      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_METADATA);

      setReadyState(video, HTMLMediaElement.HAVE_FUTURE_DATA);
      video.dispatchEvent(new Event('canplay'));

      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_FUTURE_DATA);

      setReadyState(video, HTMLMediaElement.HAVE_ENOUGH_DATA);
      video.dispatchEvent(new Event('canplaythrough'));

      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_ENOUGH_DATA);
    });

    it('follows readyState as it falls while waiting for data', () => {
      const video = createMockVideo({
        currentSrc: 'https://example.com/video.mp4',
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const store = createStore<PlayerTarget>()(sourceFeature);

      store.attach({ media: video, container: null });

      setReadyState(video, HTMLMediaElement.HAVE_CURRENT_DATA);
      video.dispatchEvent(new Event('waiting'));

      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_CURRENT_DATA);

      setReadyState(video, HTMLMediaElement.HAVE_FUTURE_DATA);
      video.dispatchEvent(new Event('playing'));

      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_FUTURE_DATA);
    });

    it('updates on loadstart event', () => {
      const video = createMockVideo({
        currentSrc: 'https://example.com/video.mp4',
      });

      const store = createStore<PlayerTarget>()(sourceFeature);

      store.attach({ media: video, container: null });

      expect(store.state.currentSrc).toBe('https://example.com/video.mp4');

      // Update mock with new source
      Object.defineProperty(video, 'currentSrc', {
        value: 'https://example.com/new.mp4',
        writable: false,
        configurable: true,
      });
      video.dispatchEvent(new Event('loadstart'));

      expect(store.state.currentSrc).toBe('https://example.com/new.mp4');
    });

    it('updates on emptied event', () => {
      const video = createMockVideo({
        currentSrc: 'https://example.com/video.mp4',
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const store = createStore<PlayerTarget>()(sourceFeature);

      store.attach({ media: video, container: null });

      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_ENOUGH_DATA);

      // Update mock to empty state
      Object.defineProperty(video, 'currentSrc', { value: '', writable: false, configurable: true });
      setReadyState(video, HTMLMediaElement.HAVE_NOTHING);
      video.dispatchEvent(new Event('emptied'));

      expect(store.state.currentSrc).toBe('');
      expect(store.state.readyState).toBe(HTMLMediaElement.HAVE_NOTHING);
    });
  });
});

function setReadyState(video: HTMLVideoElement, readyState: number): void {
  Object.defineProperty(video, 'readyState', { value: readyState, writable: false, configurable: true });
}
