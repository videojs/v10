/**
 * BackgroundLoopingVideoMediaElement adapter tests.
 *
 * Covers the HTMLMediaElement-compatible contract for src, preload, loop,
 * muted, and play(). Adapter-shape parallels SimpleHlsMediaElement; the
 * tests focus on what diverges: the new adapter owns `loop` / `muted`
 * passthroughs and defaults both to true (autoplay-muted, looping).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MaybeResolvedPresentation } from '../../../../media/types';
import { BackgroundLoopingVideoMediaElement } from '../adapter';

describe('BackgroundLoopingVideoMediaElement', () => {
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
      const media = new BackgroundLoopingVideoMediaElement();
      expect(media.src).toBe('');
    });

    it('reflects the set value synchronously', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.src = 'https://example.com/v.m3u8';
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('synchronously updates engine presentation state when src is set', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.src = 'https://example.com/v.m3u8';
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v.m3u8');
    });

    it('clears engine presentation state when src is set to empty string', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.engine.state.presentation.get()?.url).toBeFalsy();
    });
  });

  describe('attach / detach', () => {
    it('exposes the engine immediately (created at construction)', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      expect(media.engine).not.toBeNull();
    });

    it('reuses the same engine instance across attach calls', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const engineBefore = media.engine;
      media.attach(document.createElement('video'));
      media.attach(document.createElement('video'));
      expect(media.engine).toBe(engineBefore);
    });

    it('re-attaches the media element to the new engine when src changes', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v1.m3u8';
      expect(media.engine.context.mediaElement.get()).toBe(el);
    });

    it('sets mediaElement in context when attached', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      expect(media.engine.context.mediaElement.get()).toBe(el);
    });

    it('clears mediaElement in context when detached', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.engine.context.mediaElement.get()).toBeUndefined();
    });

    it('detach does not destroy the engine', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.attach(document.createElement('video'));
      const spy = vi.spyOn(media.engine, 'destroy');
      media.detach();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('loop / muted defaults', () => {
    it('defaults loop to true', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      expect(media.loop).toBe(true);
    });

    it('defaults muted to true', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      expect(media.muted).toBe(true);
    });

    it('applies loop / muted defaults to the media element on attach', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const el = document.createElement('video');
      // start the element in the opposite state so we can confirm attach overrides it
      el.loop = false;
      el.muted = false;
      media.attach(el);
      expect(el.loop).toBe(true);
      expect(el.muted).toBe(true);
    });

    // attach modifies native props; changing src doesn't
    it('preserves loop / muted to the preserved element on src change', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      el.loop = false;
      el.muted = false;
      media.src = 'https://example.com/v.m3u8';
      expect(el.loop).toBe(false);
      expect(el.muted).toBe(false);
    });

    // Skipped: `set loop` / `set muted` are noops in Phase 1 (the adapter
    // pins loop=true / muted=true for the autoplay-looping use case). These
    // assert functional setters — unskip when the setters are implemented.
    it.skip('mirrors loop changes onto the attached element', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.loop = false;
      expect(el.loop).toBe(false);
      expect(media.loop).toBe(false);
    });

    it.skip('mirrors muted changes onto the attached element', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.muted = false;
      expect(el.muted).toBe(false);
      expect(media.muted).toBe(false);
    });

    it.skip('stores loop / muted updates made before attach and applies them on attach', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.loop = false;
      media.muted = false;
      const el = document.createElement('video');
      media.attach(el);
      expect(el.loop).toBe(false);
      expect(el.muted).toBe(false);
    });
  });

  describe('play()', () => {
    it('returns a Promise', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.attach(document.createElement('video'));
      const result = media.play();
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {});
    });

    it('rejects when no media element is attached', async () => {
      const media = new BackgroundLoopingVideoMediaElement();
      await expect(media.play()).rejects.toThrow('no media element attached');
    });
  });

  describe('destroy()', () => {
    it('destroys the underlying engine', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const spy = vi.spyOn(media.engine, 'destroy');
      media.destroy();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('maxResolution', () => {
    it('defaults to undefined', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      expect(media.maxResolution).toBeUndefined();
    });

    it('reflects the value passed via constructor config', () => {
      const media = new BackgroundLoopingVideoMediaElement({
        config: { maxResolution: '720p' },
      });
      expect(media.maxResolution).toBe('720p');
    });

    it('reflects setter writes', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.maxResolution = '1080p';
      expect(media.maxResolution).toBe('1080p');
    });

    it('does not rebuild the engine on setter writes — closure picker reads the field live', () => {
      const media = new BackgroundLoopingVideoMediaElement();
      const firstEngine = media.engine;
      media.maxResolution = '720p';
      expect(media.engine).toBe(firstEngine);
    });

    // Pre-resolved 4-track presentation used by the closure-picker assertions
    // below. Setting it on `engine.state.presentation` drives the composition
    // through `presentation-unresolved → presentation-resolved`, which is
    // what fires the picker.
    const presentationWithFourTracks = (): MaybeResolvedPresentation => ({
      id: 'p',
      url: 'https://example.com/manifest.m3u8',
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

    it('the closure picker reads maxResolution at pick time', async () => {
      // Construct without a cap. If the closure captured at creation, the
      // pick would use `undefined` (→ 1440p). It uses the current field instead.
      const media = new BackgroundLoopingVideoMediaElement();
      media.maxResolution = '720p';
      media.engine.state.presentation.set(presentationWithFourTracks());
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(media.engine.state.selectedVideoTrackId.get()).toBe('720p');
      media.destroy();
    });

    it('setter writes are reflected on the next presentation cycle', async () => {
      const media = new BackgroundLoopingVideoMediaElement();
      media.engine.state.presentation.set(presentationWithFourTracks());
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(media.engine.state.selectedVideoTrackId.get()).toBe('1440p');

      media.maxResolution = '720p';
      // Cycle the presentation through unresolved → resolved so the picker
      // re-fires on entry. The microtask between the two sets lets the
      // reactor's monitor observe the transition and run exit cleanup
      // (which clears selectedVideoTrackId) before re-entry runs the picker.
      media.engine.state.presentation.set(undefined);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      media.engine.state.presentation.set(presentationWithFourTracks());
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(media.engine.state.selectedVideoTrackId.get()).toBe('720p');
      media.destroy();
    });

    it('honors a user-supplied picker, overriding the closure default', async () => {
      const media = new BackgroundLoopingVideoMediaElement({
        config: { maxResolution: '720p', picker: () => '1440p' },
      });
      media.engine.state.presentation.set(presentationWithFourTracks());
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      expect(media.engine.state.selectedVideoTrackId.get()).toBe('1440p');
      media.destroy();
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
