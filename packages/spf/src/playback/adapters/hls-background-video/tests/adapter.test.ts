/**
 * HlsBackgroundVideoMediaElement adapter tests.
 *
 * Covers the HTMLMediaElement-compatible contract for `src` and `play()`.
 * Adapter-shape parallels `HlsVideoMediaElement`; the tests focus on what
 * diverges: silent autoplay-looping playback is fixed on the element at attach
 * rather than exposed, and the picker takes the largest rendition on offer,
 * since narrowing the set is the manifest's job rather than a property here.
 *
 * `@videojs/spf/mux-background-video` re-exports these same classes, so its own
 * test asserts identity and leans on this file for behavior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MaybeResolvedPresentation } from '../../../../media/types';
import { HlsBackgroundVideoMediaElement } from '../adapter';

describe('HlsBackgroundVideoMediaElement', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('src', () => {
    it('returns empty string before any src is set', () => {
      const media = new HlsBackgroundVideoMediaElement();
      expect(media.src).toBe('');
    });

    it('reflects the set value synchronously', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.src = 'https://example.com/v.m3u8';
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('synchronously updates engine presentation state when src is set', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.src = 'https://example.com/v.m3u8';
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v.m3u8');
    });

    it('keeps the query params that narrow the manifest', () => {
      // How a cap is expressed, `?max_resolution=720p` on a Mux stream URL being
      // the case this replaces — so it has to survive the round trip untouched.
      const media = new HlsBackgroundVideoMediaElement();
      media.src = 'https://stream.mux.com/PLAYBACK_ID.m3u8?max_resolution=720p';
      expect(media.engine.state.presentation.get()?.url).toBe(
        'https://stream.mux.com/PLAYBACK_ID.m3u8?max_resolution=720p'
      );
    });

    it('clears engine presentation state when src is set to empty string', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.engine.state.presentation.get()?.url).toBeFalsy();
    });

    it('leaves engine presentation state alone when src is set to the URL already playing', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.src = 'https://example.com/v.m3u8';
      const presentation = media.engine.state.presentation.get();

      media.src = 'https://example.com/v.m3u8';

      // The same object, not an equal one: a fresh presentation re-resolves.
      expect(media.engine.state.presentation.get()).toBe(presentation);
    });
  });

  describe('attach / detach', () => {
    it('exposes the engine immediately (created at construction)', () => {
      const media = new HlsBackgroundVideoMediaElement();
      expect(media.engine).toBeDefined();
    });

    it('reuses the same engine instance across attach calls', () => {
      const media = new HlsBackgroundVideoMediaElement();
      const firstEngine = media.engine;
      media.attach(document.createElement('video'));
      media.attach(document.createElement('video'));
      expect(media.engine).toBe(firstEngine);
    });

    it('sets mediaElement in context when attached', () => {
      const media = new HlsBackgroundVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      expect(media.engine.context.mediaElement.get()).toBe(el);
    });

    it('clears mediaElement in context when detached', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.engine.context.mediaElement.get()).toBeUndefined();
    });

    it('keeps the attached element through a src change', () => {
      // The engine instance and the element both survive re-resolution, so
      // neither has to be rewired.
      const media = new HlsBackgroundVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v.m3u8';
      expect(media.engine.context.mediaElement.get()).toBe(el);
    });

    it('detach does not destroy the engine', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.attach(document.createElement('video'));
      const spy = vi.spyOn(media.engine, 'destroy');
      media.detach();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // The adapter declares none of these — a host-bound Media inherits them, and
  // `attach` is the one place the fixed behavior is written.
  describe('fixed playback behavior', () => {
    it('fixes loop, muted, autoplay, and preload on the element at attach', () => {
      const media = new HlsBackgroundVideoMediaElement();
      const el = document.createElement('video');
      // Start in the opposite state so attach is what we observe.
      el.loop = false;
      el.muted = false;
      el.autoplay = false;
      el.preload = 'none';

      media.attach(el);

      expect(el.loop).toBe(true);
      expect(el.muted).toBe(true);
      expect(el.autoplay).toBe(true);
      expect(el.preload).toBe('auto');
    });

    it('re-applies them to a second element', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.attach(document.createElement('video'));

      const next = document.createElement('video');
      next.loop = false;
      media.attach(next);

      expect(next.loop).toBe(true);
    });

    it('leaves the element alone on a src change', () => {
      // `attach` is the only writer, so a consumer that turned one of these off
      // afterwards keeps that state across re-resolution.
      const media = new HlsBackgroundVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      el.loop = false;
      el.muted = false;

      media.src = 'https://example.com/v.m3u8';

      expect(el.loop).toBe(false);
      expect(el.muted).toBe(false);
    });
  });

  describe('rendition selection', () => {
    // Pre-resolved 4-track presentation. Setting it on `engine.state.presentation`
    // drives the composition through `presentation-unresolved → resolved`, which
    // is what fires the picker.
    const presentationWithFourTracks = (): MaybeResolvedPresentation => ({
      id: 'p',
      url: 'https://example.com/v.m3u8',
      startTime: 0,
      selectionSets: [
        {
          id: 'video-set',
          type: 'video',
          switchingSets: [
            {
              id: 'video-switching',
              type: 'video',
              tracks: [
                videoTrack('360p', 640, 360, 500_000),
                videoTrack('720p', 1280, 720, 2_000_000),
                videoTrack('1080p', 1920, 1080, 4_000_000),
                videoTrack('1440p', 2560, 1440, 8_000_000),
              ],
            },
          ],
        },
      ],
    });

    it('picks the largest rendition on offer', async () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.engine.state.presentation.set(presentationWithFourTracks());
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(media.engine.state.selectedVideoTrackId.get()).toBe('1440p');
      media.destroy();
    });

    it('picks the largest of whatever the manifest offers, which is how a capped URL narrows it', async () => {
      // What `?max_resolution=720p` produces: the excluded renditions are absent
      // from the manifest rather than present and skipped.
      const capped = presentationWithFourTracks();
      capped.selectionSets![0]!.switchingSets[0]!.tracks = [
        videoTrack('360p', 640, 360, 500_000),
        videoTrack('720p', 1280, 720, 2_000_000),
      ] as never;

      const media = new HlsBackgroundVideoMediaElement();
      media.engine.state.presentation.set(capped);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(media.engine.state.selectedVideoTrackId.get()).toBe('720p');
      media.destroy();
    });

    it('honors a config-supplied picker, overriding the adapter default', async () => {
      // The adapter's own picker is spread first, so a consumer-supplied one wins.
      const media = new HlsBackgroundVideoMediaElement({ config: { picker: () => '360p' } });
      media.engine.state.presentation.set(presentationWithFourTracks());
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(media.engine.state.selectedVideoTrackId.get()).toBe('360p');
      media.destroy();
    });
  });

  describe('play()', () => {
    it('returns a Promise', () => {
      const media = new HlsBackgroundVideoMediaElement();
      media.attach(document.createElement('video'));
      const result = media.play();
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {});
    });

    it('rejects when no media element is attached', async () => {
      const media = new HlsBackgroundVideoMediaElement();
      await expect(media.play()).rejects.toThrow('no media element attached');
    });
  });

  describe('destroy()', () => {
    it('destroys the underlying engine', () => {
      const media = new HlsBackgroundVideoMediaElement();
      const spy = vi.spyOn(media.engine, 'destroy');
      media.destroy();
      expect(spy).toHaveBeenCalled();
    });
  });
});

function videoTrack(id: string, width: number, height: number, bandwidth: number) {
  return {
    type: 'video' as const,
    id,
    url: `https://example.com/${id}.m3u8`,
    bandwidth,
    mimeType: 'video/mp4',
    codecs: ['avc1.42E01E'],
    initialization: { url: 'init', byteRange: { offset: 0, length: 0 } },
    segments: [],
    startTime: 0,
    duration: 0,
    width,
    height,
  } as never;
}
