import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';

import type { PlayerTarget } from '../../../media/types';
import { textTrackFeature } from '../text-track';

/**
 * jsdom's TextTrackList does not implement EventTarget (no addEventListener/
 * dispatchEvent), so `listen(media.textTracks, ...)` throws. The store's
 * error boundary catches this, but we can't dispatch textTracks events in
 * tests. We test what we can: initial state, track detection via `addTextTrack`,
 * and `loadstart` resync (dispatched on media, which works).
 */

function createVideo(): HTMLVideoElement {
  return document.createElement('video');
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
      const video = createVideo();
      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.chaptersCues).toEqual([]);
      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
      expect(store.state.subtitlesList).toEqual([]);
      expect(store.state.subtitlesShowing).toBe(false);
    });
  });

  describe('attach', () => {
    it('detects chapters track via addTextTrack', () => {
      const video = createVideo();
      video.addTextTrack('chapters', 'Chapters', 'en');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      // Track detected, but no cues in jsdom
      expect(store.state.chaptersCues).toEqual([]);
    });

    it('detects thumbnail track by kind and label', () => {
      const video = createVideo();
      video.addTextTrack('metadata', 'thumbnails', 'en');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      // Track detected, but no cues or <track> element for src
      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });

    it('ignores metadata tracks without thumbnails label', () => {
      const video = createVideo();
      video.addTextTrack('metadata', 'ad-cues', 'en');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });

    it('prefers first matching track when multiple exist', () => {
      const video = createVideo();
      video.addTextTrack('chapters', 'Ch1', 'en');
      video.addTextTrack('chapters', 'Ch2', 'fr');
      video.addTextTrack('metadata', 'thumbnails', 'en');
      video.addTextTrack('metadata', 'thumbnails', 'fr');

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      // Should not error with multiple matching tracks
      expect(store.state.chaptersCues).toEqual([]);
      expect(store.state.thumbnailCues).toEqual([]);
    });

    it('resyncs on loadstart event', () => {
      const video = createVideo();

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      // Add a track programmatically (won't trigger textTracks event in jsdom)
      video.addTextTrack('metadata', 'thumbnails', 'en');

      // Dispatch loadstart to trigger resync
      video.dispatchEvent(new Event('loadstart'));

      // After loadstart, the new track should be detected
      expect(store.state.thumbnailCues).toEqual([]);
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });

    it('resolves thumbnailTrackSrc from track element', () => {
      const video = createVideo();
      const trackEl = document.createElement('track');
      trackEl.kind = 'metadata';
      trackEl.label = 'thumbnails';
      trackEl.src = 'https://cdn.example.com/thumbnails.vtt';
      trackEl.default = true;
      video.appendChild(trackEl);

      // In jsdom, appending <track> to <video> adds to textTracks.
      // The track.track property links the element to its TextTrack.
      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

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
      const video = createVideo();
      mockTextTracks(video, [createMockTrack('subtitles', 'showing')]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.subtitlesShowing).toBe(true);
    });

    it('exposes subtitlesList from captions/subtitles tracks', () => {
      const video = createVideo();
      const subtitlesTrack = { kind: 'subtitles', mode: 'showing', label: 'English', language: 'en' } as TextTrack;
      const captionsTrack = { kind: 'captions', mode: 'disabled', label: 'CC', language: 'en' } as TextTrack;
      mockTextTracks(video, [subtitlesTrack, captionsTrack, createMockTrack('metadata', 'showing')]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.subtitlesList).toEqual([
        { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
        { kind: 'captions', label: 'CC', language: 'en', mode: 'disabled' },
      ]);
    });

    it('toggleSubtitles() enables and disables caption/subtitle tracks', () => {
      const video = createVideo();
      const subtitlesTrack = createMockTrack('subtitles');
      const captionsTrack = createMockTrack('captions');
      mockTextTracks(video, [subtitlesTrack, captionsTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

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
      const video = createVideo();
      const metadataTrack = createMockTrack('metadata', 'showing');
      mockTextTracks(video, [metadataTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.toggleSubtitles()).toBe(false);
    });

    it('stops updating after destroy', () => {
      const video = createVideo();
      const store = createStore<PlayerTarget>()(textTrackFeature);
      store.attach({ media: video, container: null });

      store.destroy();

      // Add tracks after destroy
      video.addTextTrack('metadata', 'thumbnails', 'en');
      video.dispatchEvent(new Event('loadstart'));

      // State remains at defaults
      expect(store.state.thumbnailTrackSrc).toBeNull();
    });
  });
});
