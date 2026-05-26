import { createStore, flush } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { metadataFeature } from '../metadata';

class MockMediaMetadata {
  title: string;
  constructor(init: { title: string }) {
    this.title = init.title;
  }
}

describe('metadataFeature', () => {
  let mockMediaSession: { metadata: MockMediaMetadata | null };

  beforeEach(() => {
    mockMediaSession = { metadata: null };
    Object.defineProperty(navigator, 'mediaSession', {
      value: mockMediaSession,
      configurable: true,
    });
    vi.stubGlobal('MediaMetadata', MockMediaMetadata);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaSession', {
      value: undefined,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('starts with title: null', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      expect(store.state.title).toBeNull();
    });
  });

  describe('setTitle', () => {
    it('updates title in state', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      store.state.setTitle('Big Buck Bunny');
      expect(store.state.title).toBe('Big Buck Bunny');
    });

    it('clears title when passed null', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      store.state.setTitle('Big Buck Bunny');
      store.state.setTitle(null);
      expect(store.state.title).toBeNull();
    });
  });

  describe('MediaSession sync', () => {
    it('sets MediaSession metadata when title is set after attach', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      const video = createMockVideo();
      store.attach({ media: video, container: null });

      store.state.setTitle('Elephants Dream');
      flush();

      expect(mockMediaSession.metadata).toBeInstanceOf(MockMediaMetadata);
      expect(mockMediaSession.metadata?.title).toBe('Elephants Dream');
    });

    it('clears MediaSession metadata when title is set to null', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      const video = createMockVideo();
      store.attach({ media: video, container: null });

      store.state.setTitle('Elephants Dream');
      flush();
      store.state.setTitle(null);
      flush();

      expect(mockMediaSession.metadata).toBeNull();
    });

    it('clears MediaSession metadata on store detach', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      const video = createMockVideo();
      const detach = store.attach({ media: video, container: null });

      store.state.setTitle('Big Buck Bunny');
      flush();
      expect(mockMediaSession.metadata?.title).toBe('Big Buck Bunny');

      detach();

      expect(mockMediaSession.metadata).toBeNull();
    });

    it('clears MediaSession metadata on store destroy', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      const video = createMockVideo();
      store.attach({ media: video, container: null });

      store.state.setTitle('Big Buck Bunny');
      flush();
      expect(mockMediaSession.metadata?.title).toBe('Big Buck Bunny');

      store.destroy();

      expect(mockMediaSession.metadata).toBeNull();
    });
  });

  describe('MediaSession not supported', () => {
    it('does not throw when mediaSession is absent', () => {
      // Ensure mediaSession is not present (undo beforeEach setup)
      Object.defineProperty(navigator, 'mediaSession', {
        value: undefined,
        configurable: true,
      });

      const store = createStore<PlayerTarget>()(metadataFeature);
      const video = createMockVideo();
      // attach should short-circuit because session is falsy
      store.attach({ media: video, container: null });

      store.state.setTitle('Big Buck Bunny');
      flush();
      // Title state still updates; only MediaSession sync is skipped
      expect(store.state.title).toBe('Big Buck Bunny');
    });
  });

  describe('reattach', () => {
    it('re-syncs MediaSession after reattach', () => {
      const store = createStore<PlayerTarget>()(metadataFeature);
      const video = createMockVideo();

      const detach = store.attach({ media: video, container: null });
      store.state.setTitle('Big Buck Bunny');
      flush();
      detach();

      expect(mockMediaSession.metadata).toBeNull();

      store.attach({ media: video, container: null });
      store.state.setTitle('Elephants Dream');
      flush();

      expect(mockMediaSession.metadata?.title).toBe('Elephants Dream');
    });
  });
});
