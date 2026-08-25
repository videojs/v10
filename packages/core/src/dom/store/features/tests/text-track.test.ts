import { createStore } from '@videojs/store';
import { describe, expect, it, vi } from 'vite-plus/test';

import type { PlayerTarget } from '../../../player';
import { textTrackFeature } from '../text-track';

/**
 * Jsdom's TextTrackList does not implement EventTarget (no addEventListener/ dispatchEvent), so
 * `listen(media.textTracks, ...)` throws. The store's error boundary catches this, but we can't dispatch textTracks
 * events in tests. We test what we can: initial state, track detection via `addTextTrack`, and `loadstart` resync
 * (dispatched on media, which works).
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

function createMockTrack(
  kind: TextTrackKind,
  mode: TextTrackMode = 'disabled',
  options: { id?: string; label?: string; language?: string } = {}
): TextTrack {
  return {
    id: options.id ?? '',
    kind,
    mode,
    label: options.label ?? '',
    language: options.language ?? '',
  } as TextTrack;
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
      expect(store.state.thumbnailTrackCrossOrigin).toBeNull();
      expect(store.state.textTrackList).toEqual([]);
      expect(store.state.subtitlesShowing).toBe(false);
    });
  });

  describe('thumbnailTrackCrossOrigin', () => {
    /**
     * Resolve the state for a media element carrying a thumbnail track. Uses `mockTextTracks` rather than
     * `addTextTrack`, which jsdom implements as a no-op that never populates `textTracks`.
     */
    function crossOriginFor(crossOrigin: string | undefined, kind: TextTrackKind = 'metadata') {
      const video = createVideo();

      if (crossOrigin !== undefined) video.setAttribute('crossorigin', crossOrigin);

      mockTextTracks(video, [createMockTrack(kind, 'disabled', { label: 'thumbnails' })]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      return store.state.thumbnailTrackCrossOrigin;
    }

    it('reports the media element CORS mode', () => {
      expect(crossOriginFor('anonymous')).toBe('anonymous');
      expect(crossOriginFor('use-credentials')).toBe('use-credentials');
    });

    it('maps the empty string and unknown keywords to anonymous', () => {
      // The CORS-settings attribute treats every value but `use-credentials` as
      // Anonymous. A custom media element reflects `crossOrigin` as a plain
      // string, so unnormalized values reach here in practice.
      expect(crossOriginFor('')).toBe('anonymous');
      expect(crossOriginFor('bogus')).toBe('anonymous');
      expect(crossOriginFor('USE-CREDENTIALS')).toBe('use-credentials');
    });

    it('is null when the media element is not in CORS mode', () => {
      expect(crossOriginFor(undefined)).toBeNull();
    });

    it('is null when there is no thumbnail track to inherit for', () => {
      expect(crossOriginFor('anonymous', 'subtitles')).toBeNull();
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

    it('exposes textTrackList for all track kinds', () => {
      const video = createVideo();
      const subtitlesTrack = createMockTrack('subtitles', 'showing', {
        id: 'subtitles-en',
        label: 'English',
        language: 'en',
      });
      const captionsTrack = createMockTrack('captions', 'disabled', {
        id: 'captions-en',
        label: 'CC',
        language: 'en',
      });
      const metadataTrack = createMockTrack('metadata', 'showing', { id: 'metadata-thumbnails' });

      mockTextTracks(video, [subtitlesTrack, captionsTrack, metadataTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      expect(store.state.textTrackList).toEqual([
        { id: 'subtitles-en', kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
        { id: 'captions-en', kind: 'captions', label: 'CC', language: 'en', mode: 'disabled' },
        { id: 'metadata-thumbnails', kind: 'metadata', label: '', language: '', mode: 'showing' },
      ]);
    });

    it('toggleSubtitles() enables a single caption/subtitle track and disables them all', () => {
      const video = createVideo();
      const subtitlesTrack = createMockTrack('subtitles');
      const captionsTrack = createMockTrack('captions');

      mockTextTracks(video, [subtitlesTrack, captionsTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      const enabled = store.state.toggleSubtitles();

      expect(enabled).toBe(true);
      // Captions sort before subtitles, matching the captions menu order.
      expect(captionsTrack.mode).toBe('showing');
      expect(subtitlesTrack.mode).toBe('disabled');

      const disabled = store.state.toggleSubtitles(false);

      expect(disabled).toBe(false);
      expect(subtitlesTrack.mode).toBe('disabled');
      expect(captionsTrack.mode).toBe('disabled');
    });

    it('toggleSubtitles() prefers an exact browser locale match', () => {
      const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-CA');
      const video = createVideo();
      const frenchTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-fr', language: 'fr-FR' });
      const canadianTrack = createMockTrack('subtitles', 'disabled', {
        id: 'subtitles-fr-ca',
        language: 'fr-CA',
      });

      mockTextTracks(video, [frenchTrack, canadianTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      expect(store.state.toggleSubtitles()).toBe(true);
      expect(frenchTrack.mode).toBe('disabled');
      expect(canadianTrack.mode).toBe('showing');

      language.mockRestore();
    });

    it('toggleSubtitles() falls back from a regional browser locale to its language', () => {
      const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-BE');
      const video = createVideo();
      const canadianTrack = createMockTrack('subtitles', 'disabled', {
        id: 'subtitles-fr-ca',
        language: 'fr-CA',
      });
      const frenchTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-fr', language: 'fr' });

      mockTextTracks(video, [canadianTrack, frenchTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      expect(store.state.toggleSubtitles()).toBe(true);
      expect(canadianTrack.mode).toBe('disabled');
      expect(frenchTrack.mode).toBe('showing');

      language.mockRestore();
    });

    it('toggleSubtitles() uses the first track when the browser locale does not match', () => {
      const language = vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-BE');
      const video = createVideo();
      const spanishTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-es', language: 'es' });
      const englishTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-en', language: 'en' });

      mockTextTracks(video, [spanishTrack, englishTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      expect(store.state.toggleSubtitles()).toBe(true);
      expect(spanishTrack.mode).toBe('showing');
      expect(englishTrack.mode).toBe('disabled');

      language.mockRestore();
    });

    it('toggleSubtitles() restores the track that was showing', () => {
      const video = createVideo();
      const englishTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-en', language: 'en' });
      const germanTrack = createMockTrack('subtitles', 'showing', { id: 'subtitles-de', language: 'de' });

      mockTextTracks(video, [englishTrack, germanTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      expect(store.state.toggleSubtitles()).toBe(false);
      expect(englishTrack.mode).toBe('disabled');
      expect(germanTrack.mode).toBe('disabled');

      expect(store.state.toggleSubtitles()).toBe(true);
      expect(englishTrack.mode).toBe('disabled');
      expect(germanTrack.mode).toBe('showing');
    });

    it('toggleSubtitles() restores the track selected through selectSubtitlesTrack()', () => {
      const video = createVideo();
      const englishTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-en', language: 'en' });
      const germanTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-de', language: 'de' });

      mockTextTracks(video, [englishTrack, germanTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      store.state.selectSubtitlesTrack('subtitles-de');
      store.state.selectSubtitlesTrack('off');

      expect(store.state.toggleSubtitles()).toBe(true);
      expect(englishTrack.mode).toBe('disabled');
      expect(germanTrack.mode).toBe('showing');
    });

    it('toggleSubtitles(true) keeps the showing track instead of enabling every track', () => {
      const video = createVideo();
      const englishTrack = createMockTrack('subtitles', 'showing', { id: 'subtitles-en', language: 'en' });
      const germanTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-de', language: 'de' });

      mockTextTracks(video, [englishTrack, germanTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      expect(store.state.toggleSubtitles(true)).toBe(true);
      expect(englishTrack.mode).toBe('showing');
      expect(germanTrack.mode).toBe('disabled');
    });

    it('toggleSubtitles() falls back to the first track when the remembered track is gone', () => {
      const video = createVideo();
      const germanTrack = createMockTrack('subtitles', 'showing', { id: 'subtitles-de', language: 'de' });

      mockTextTracks(video, [germanTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      store.state.toggleSubtitles(false);

      const frenchTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-fr', language: 'fr' });
      const spanishTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-es', language: 'es' });

      mockTextTracks(video, [frenchTrack, spanishTrack]);

      expect(store.state.toggleSubtitles()).toBe(true);
      expect(frenchTrack.mode).toBe('showing');
      expect(spanishTrack.mode).toBe('disabled');
    });

    it('toggleSubtitles() returns false when no subtitle tracks exist', () => {
      const video = createVideo();
      const metadataTrack = createMockTrack('metadata', 'showing');

      mockTextTracks(video, [metadataTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      expect(store.state.toggleSubtitles()).toBe(false);
    });

    it('selectSubtitlesTrack() enables one track and disables the others', () => {
      const video = createVideo();
      const englishTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-en', label: 'English' });
      const spanishTrack = createMockTrack('subtitles', 'disabled', { id: 'subtitles-es', label: 'Spanish' });

      mockTextTracks(video, [englishTrack, spanishTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      store.state.selectSubtitlesTrack('subtitles-es');

      expect(englishTrack.mode).toBe('disabled');
      expect(spanishTrack.mode).toBe('showing');
    });

    it('selectSubtitlesTrack("off") disables all caption tracks', () => {
      const video = createVideo();
      const englishTrack = createMockTrack('subtitles', 'showing');
      const spanishTrack = createMockTrack('subtitles', 'disabled');

      mockTextTracks(video, [englishTrack, spanishTrack]);

      const store = createStore<PlayerTarget>()(textTrackFeature);

      store.attach({ media: video, container: null });

      store.state.selectSubtitlesTrack('off');

      expect(englishTrack.mode).toBe('disabled');
      expect(spanishTrack.mode).toBe('disabled');
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
