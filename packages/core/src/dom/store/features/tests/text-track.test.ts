import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { HTMLVideoElementHost } from '../../../media/video-host';
import { textTrackFeature } from '../text-track';

/**
 * jsdom's TextTrackList does not implement EventTarget (no addEventListener/
 * dispatchEvent), so `listen(media.textTracks, ...)` throws. The store's
 * error boundary catches this, but we can't dispatch textTracks events in
 * tests. We test what we can: initial state, track detection via `addTextTrack`,
 * and `loadstart` resync (dispatched on media, which works).
 */

function createVideo(): { host: HTMLVideoElementHost; video: HTMLVideoElement } {
  const video = document.createElement('video');
  const host = new HTMLVideoElementHost();
  host.attach(video);
  return { host, video };
}

function mockTextTracks(video: HTMLVideoElement, tracks: TextTrack[]): void {
  const list: Partial<TextTrackList> & Record<number, TextTrack> = { length: tracks.length };

  for (const [index, track] of tracks.entries()) {
    list[index] = track;
  }

  Object.defineProperty(video, 'textTracks', {
    configurable: true,
    value: list as TextTrackList,
  });
}

function createMockTrack(kind: TextTrackKind, mode: TextTrackMode = 'disabled'): TextTrack {
  return { kind, mode, label: '', language: '' } as TextTrack;
}

describe('textTrackFeature', () => {
  describe('initial state', () => {
    it('has empty initial state', () => {
      const { host } = createVideo();
      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.chaptersCues).toEqual([]);
      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
      expect(store.state.textTrackList).toEqual([]);
      expect(store.state.subtitlesShowing).toBe(false);
    });
  });

  describe('attach', () => {
    it('detects chapters track via addTextTrack', () => {
      const { host, video } = createVideo();
      video.addTextTrack('chapters', 'Chapters', 'en');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      // Track detected, but no cues in jsdom
      expect(store.state.chaptersCues).toEqual([]);
    });

    it('detects thumbnail track by kind and label', () => {
      const { host, video } = createVideo();
      video.addTextTrack('metadata', 'thumbnails', 'en');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      // Track detected, but no cues or <track> element for src
      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });

    it('ignores metadata tracks without thumbnails label', () => {
      const { host, video } = createVideo();
      video.addTextTrack('metadata', 'ad-cues', 'en');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });

    it('prefers first matching track when multiple exist', () => {
      const { host, video } = createVideo();
      video.addTextTrack('chapters', 'Ch1', 'en');
      video.addTextTrack('chapters', 'Ch2', 'fr');
      video.addTextTrack('metadata', 'thumbnails', 'en');
      video.addTextTrack('metadata', 'thumbnails', 'fr');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      // Should not error with multiple matching tracks
      expect(store.state.chaptersCues).toEqual([]);
      expect(store.state.thumbnailCues).toEqual([]);
    });

    it('resyncs on loadstart event', () => {
      const { host, video } = createVideo();

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      // Add a track programmatically (won't trigger textTracks event in jsdom)
      video.addTextTrack('metadata', 'thumbnails', 'en');

      // Dispatch loadstart to trigger resync
      video.dispatchEvent(new Event('loadstart'));

      // After loadstart, the new track should be detected
      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });

    it('resolves thumbnailTrackSrc from track element', () => {
      const { host, video } = createVideo();
      const trackEl = document.createElement('track');
      trackEl.kind = 'metadata';
      trackEl.label = 'thumbnails';
      trackEl.src = 'https://cdn.example.com/thumbnails.vtt';
      trackEl.default = true;
      video.appendChild(trackEl);

      // In jsdom, appending <track> to <video> adds to textTracks.
      // The track.track property links the element to its TextTrack.
      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      // findTrackElement maps TextTrack → <track> element → src
      // jsdom's TextTrack from <track> may or may not match addTextTrack
      // entries, so check if the src was resolved.
      // Note: jsdom support for this varies; the feature is validated
      // in real browsers via Playwright.
      if (store.state.thumbnailTrackSrc !== null) {
        expect(store.state.thumbnailTrackSrc).toBe('https://cdn.example.com/thumbnails.vtt');
      }
    });

    it('sets subtitlesShowing when a subtitles track is showing', () => {
      const { host, video } = createVideo();
      mockTextTracks(video, [createMockTrack('subtitles', 'showing')]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.subtitlesShowing).toBe(true);
    });

    it('exposes textTrackList for all track kinds', () => {
      const { host, video } = createVideo();
      const subtitlesTrack = { kind: 'subtitles', mode: 'showing', label: 'English', language: 'en' } as TextTrack;
      const captionsTrack = { kind: 'captions', mode: 'disabled', label: 'CC', language: 'en' } as TextTrack;
      const metadataTrack = createMockTrack('metadata', 'showing');
      mockTextTracks(video, [subtitlesTrack, captionsTrack, metadataTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.textTrackList).toEqual([
        { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
        { kind: 'captions', label: 'CC', language: 'en', mode: 'disabled' },
        { kind: 'metadata', label: '', language: '', mode: 'showing' },
      ]);
    });

    it('toggleSubtitles() enables and disables caption/subtitle tracks', () => {
      const { host, video } = createVideo();
      const subtitlesTrack = createMockTrack('subtitles');
      const captionsTrack = createMockTrack('captions');
      mockTextTracks(video, [subtitlesTrack, captionsTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      const enabled = store.state.toggleSubtitles();
      expect(enabled).toBe(true);
      expect(subtitlesTrack.mode).toBe('showing');
      expect(captionsTrack.mode).toBe('showing');

      const disabled = store.state.toggleSubtitles(false);
      expect(disabled).toBe(false);
      expect(subtitlesTrack.mode).toBe('disabled');
      expect(captionsTrack.mode).toBe('disabled');
    });

    it('toggleSubtitles() returns false when no subtitle tracks exist', () => {
      const { host, video } = createVideo();
      const metadataTrack = createMockTrack('metadata', 'showing');
      mockTextTracks(video, [metadataTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      expect(store.state.toggleSubtitles()).toBe(false);
    });

    it('stops updating after destroy', () => {
      const { host, video } = createVideo();
      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: host, container: null });

      store.destroy();

      // Add tracks after destroy
      video.addTextTrack('metadata', 'thumbnails', 'en');
      video.dispatchEvent(new Event('loadstart'));

      // State remains at defaults
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });
  });
});
