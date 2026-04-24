import { combine, createStore } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { HTMLVideoElementHost } from '../../../media/video-host';
import { createMockVideoHost } from '../../../tests/test-helpers';
import { sourceFeature } from '../source';
import { timeFeature } from '../time';

describe('sourceFeature', () => {
  describe('attach', () => {
    it('syncs source state on attach', () => {
      const { host } = createMockVideoHost({
        currentSrc: 'https://example.com/video.mp4',
        src: 'https://example.com/video.mp4',
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const store = createStore<PlayerTarget>()(sourceFeature);
      store.attach({ media: host, container: null });

      expect(store.state.source).toBe('https://example.com/video.mp4');
      expect(store.state.canPlay).toBe(true);
    });

    it('returns null source when no source set', () => {
      // Note: Don't set src at all - setting src="" resolves to page URL
      const video = document.createElement('video');
      Object.defineProperty(video, 'currentSrc', { value: '', writable: false });
      Object.defineProperty(video, 'readyState', { value: HTMLMediaElement.HAVE_NOTHING, writable: false });

      const host = new HTMLVideoElementHost();
      host.attach(video);

      const store = createStore<PlayerTarget>()(sourceFeature);
      store.attach({ media: host, container: null });

      expect(store.state.source).toBe(null);
      expect(store.state.canPlay).toBe(false);
    });

    it('updates on canplay event', () => {
      const { host, video } = createMockVideoHost({
        currentSrc: '',
        readyState: HTMLMediaElement.HAVE_NOTHING,
      });

      const store = createStore<PlayerTarget>()(sourceFeature);
      store.attach({ media: host, container: null });

      expect(store.state.canPlay).toBe(false);

      // Update mock to ready state
      Object.defineProperty(video, 'readyState', {
        value: HTMLMediaElement.HAVE_ENOUGH_DATA,
        writable: false,
        configurable: true,
      });
      video.dispatchEvent(new Event('canplay'));

      expect(store.state.canPlay).toBe(true);
    });

    it('updates on loadstart event', () => {
      const { host, video } = createMockVideoHost({
        currentSrc: 'https://example.com/video.mp4',
      });

      const store = createStore<PlayerTarget>()(sourceFeature);
      store.attach({ media: host, container: null });

      expect(store.state.source).toBe('https://example.com/video.mp4');

      // Update mock with new source
      Object.defineProperty(video, 'currentSrc', {
        value: 'https://example.com/new.mp4',
        writable: false,
        configurable: true,
      });
      video.dispatchEvent(new Event('loadstart'));

      expect(store.state.source).toBe('https://example.com/new.mp4');
    });

    it('updates on emptied event', () => {
      const { host, video } = createMockVideoHost({
        currentSrc: 'https://example.com/video.mp4',
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const store = createStore<PlayerTarget>()(sourceFeature);
      store.attach({ media: host, container: null });

      expect(store.state.canPlay).toBe(true);

      // Update mock to empty state
      Object.defineProperty(video, 'currentSrc', { value: '', writable: false, configurable: true });
      Object.defineProperty(video, 'readyState', {
        value: HTMLMediaElement.HAVE_NOTHING,
        writable: false,
        configurable: true,
      });
      video.dispatchEvent(new Event('emptied'));

      expect(store.state.source).toBe(null);
      expect(store.state.canPlay).toBe(false);
    });
  });

  describe('actions', () => {
    describe('loadSource', () => {
      it('sets src on target and calls load', async () => {
        const { host, video } = createMockVideoHost({});
        video.load = vi.fn();

        const store = createStore<PlayerTarget>()(sourceFeature);
        store.attach({ media: host, container: null });

        const result = await store.loadSource('https://example.com/new.mp4');

        expect(video.src).toBe('https://example.com/new.mp4');
        expect(video.load).toHaveBeenCalled();
        expect(result).toBe('https://example.com/new.mp4');
      });

      it('aborts pending operations when loading new source', async () => {
        const { host, video } = createMockVideoHost({
          readyState: HTMLMediaElement.HAVE_METADATA,
        });
        video.load = vi.fn();

        const store = createStore<PlayerTarget>()(combine(sourceFeature, timeFeature));
        store.attach({ media: host, container: null });

        // Start a seek that will wait for seeked event
        const seekPromise = store.seek(30);

        // Load new source before seek completes - should abort the seek
        store.loadSource('https://example.com/new.mp4');

        // Seek should resolve immediately (aborted)
        const result = await seekPromise;
        expect(result).toBe(30); // Returns current position

        expect(video.load).toHaveBeenCalled();
      });
    });
  });
});
