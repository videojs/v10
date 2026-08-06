/**
 * SimpleHlsAudioOnlyMediaElement adapter tests.
 *
 * Covers the HTMLMediaElement-compatible contract for src and play(), per the
 * WHATWG HTML spec, for the audio-only HLS variant. Parallels
 * adapter.test.ts — semantics match (the variant differs in composition,
 * not in adapter contract).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_PLAYBACK_FEATURE,
} from '../../../../media/errors';
import { UNSUPPORTED_PLAYBACK_FEATURE_MESSAGE } from '../../../primitives/error-messages';
import { SimpleHlsAudioOnlyMediaElement, SimpleHlsAudioOnlyMediaMixin } from '../adapter-audio-only';

describe('SimpleHlsAudioOnlyMediaElement', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // src — synchronous IDL attribute reflection (WHATWG §4.8.11.2)
  // ---------------------------------------------------------------------------
  describe('src', () => {
    it('returns empty string before any src is set', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      expect(media.src).toBe('');
    });

    it('reflects the set value synchronously', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v.m3u8';
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('reflects the most recently set value', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.src).toBe('https://example.com/v2.m3u8');
    });

    it('reflects empty string when set to empty', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.src).toBe('');
    });

    it('synchronously updates engine presentation state when src is set', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v.m3u8';
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v.m3u8');
    });

    it('synchronously updates engine presentation state when src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v2.m3u8');
    });

    it('clears engine presentation state when src is set to empty string', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.engine.state.presentation.get()?.url).toBeFalsy();
    });
  });

  // ---------------------------------------------------------------------------
  // attach / detach — media element lifecycle (reuses the same engine)
  // ---------------------------------------------------------------------------
  describe('attach / detach', () => {
    it('exposes the engine immediately (created at construction, not on attach)', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      expect(media.engine).not.toBeNull();
    });

    it('reuses the same engine instance across attach calls', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const el1 = document.createElement('video');
      const el2 = document.createElement('video');
      media.attach(el1);
      const engineAfterFirstAttach = media.engine;
      media.attach(el2);
      expect(media.engine).toBe(engineAfterFirstAttach);
    });

    it('reuses the same engine instance across attach/detach cycles', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.attach(document.createElement('video'));
      const engine = media.engine;
      media.detach();
      media.attach(document.createElement('video'));
      expect(media.engine).toBe(engine);
    });

    it('reuses the same engine instance when src is set', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const initial = media.engine;
      media.src = 'https://example.com/v1.m3u8';
      expect(media.engine).toBe(initial);
    });

    it('reuses the same engine instance when src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      const engine = media.engine;
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine).toBe(engine);
    });

    it('does not destroy the engine when src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      const spy = vi.spyOn(media.engine, 'destroy');
      media.src = 'https://example.com/v2.m3u8';
      expect(spy).not.toHaveBeenCalled();
    });

    it('keeps the attached media element across src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine.context.mediaElement.get()).toBe(el);
    });

    it('sets mediaElement in owners when attached', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      expect(media.engine.context.mediaElement.get()).toBe(el);
    });

    it('clears mediaElement in owners when detached', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.engine.context.mediaElement.get()).toBeUndefined();
    });

    it('updates mediaElement when re-attached to a different element', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const el1 = document.createElement('video');
      const el2 = document.createElement('video');
      media.attach(el1);
      media.attach(el2);
      expect(media.engine.context.mediaElement.get()).toBe(el2);
    });

    it('preserves src across attach/detach cycles', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('src set before attach is reflected in engine state', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.attach(document.createElement('video'));
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v.m3u8');
    });

    it('detach does not destroy the engine', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.attach(document.createElement('video'));
      const spy = vi.spyOn(media.engine, 'destroy');
      media.detach();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // play() — WHATWG §4.8.11.8
  // ---------------------------------------------------------------------------
  describe('play()', () => {
    it('returns a Promise', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.attach(document.createElement('video'));
      const result = media.play();
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {});
    });

    it('sets loadActivated on engine state when called', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.attach(document.createElement('video'));
      media.play().catch(() => {});
      expect(media.engine.state.loadActivated.get()).toBe(true);
    });

    it('retries play() via loadstart when element has no src but adapter has one', async () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v.m3u8';

      let playCallCount = 0;
      const originalPlay = el.play.bind(el);
      el.play = () => {
        playCallCount++;
        if (playCallCount === 1) {
          return Promise.reject(new Error('no supported sources'));
        }
        return originalPlay();
      };

      const playPromise = media.play();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      el.dispatchEvent(new Event('loadstart'));

      await playPromise.catch(() => {});
      expect(playCallCount).toBe(2);
    });

    it('re-throws when play() rejects and no adapter src is set', async () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const el = document.createElement('video');
      media.attach(el);

      const err = new Error('autoplay policy');
      el.play = () => Promise.reject(err);

      await expect(media.play()).rejects.toThrow('autoplay policy');
    });
  });

  // ---------------------------------------------------------------------------
  // preload — synchronous IDL attribute (WHATWG §4.8.11.2)
  // ---------------------------------------------------------------------------
  describe('preload', () => {
    it('returns empty string before any preload is set', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      expect(media.preload).toBe('');
    });

    it('reflects the set value synchronously', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.preload = 'auto';
      expect(media.preload).toBe('auto');
    });

    it('updates engine state immediately when set', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.preload = 'none';
      expect(media.engine.state.preload.get()).toBe('none');
    });

    it('keeps explicit preload in engine state across src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.preload = 'none';
      media.src = 'https://example.com/v.m3u8';
      // The engine is recycled, so state.preload is an engine-wide preference
      // that simply persists across the src change — no re-application needed.
      expect(media.preload).toBe('none');
      expect(media.engine.state.preload.get()).toBe('none');
    });
  });

  // ---------------------------------------------------------------------------
  // disableRemotePlayback — synchronous IDL attribute (WHATWG Remote Playback)
  // ---------------------------------------------------------------------------
  describe('disableRemotePlayback', () => {
    it('defaults to false', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      expect(media.disableRemotePlayback).toBe(false);
    });

    it('reflects the set value synchronously', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.disableRemotePlayback = true;
      expect(media.disableRemotePlayback).toBe(true);
    });

    it('updates engine state immediately when set', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.disableRemotePlayback = true;
      expect(media.engine.state.disableRemotePlayback.get()).toBe(true);
    });

    it('keeps the author opt-out in engine state across src changes', () => {
      // The engine is recycled, so author intent persists on the same signal.
      // An opted-out consumer must never get an AirPlay picker back on a
      // source change.
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.disableRemotePlayback = true;
      media.src = 'https://example.com/v.m3u8';
      expect(media.disableRemotePlayback).toBe(true);
      expect(media.engine.state.disableRemotePlayback.get()).toBe(true);
    });

    it('keeps a re-enabled remote playback across src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.disableRemotePlayback = true;
      media.disableRemotePlayback = false;
      media.src = 'https://example.com/v.m3u8';
      expect(media.engine.state.disableRemotePlayback.get()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // destroy()
  // ---------------------------------------------------------------------------
  describe('destroy()', () => {
    it('destroys the underlying engine', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const spy = vi.spyOn(media.engine, 'destroy');
      media.destroy();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------------------
  // Error surface — parallels adapter.test.ts, with a narrower fatal policy
  // ---------------------------------------------------------------------------
  describe('error surface', () => {
    class TestMedia extends SimpleHlsAudioOnlyMediaMixin(EventTarget) {}

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('exposes no error before anything is reported', () => {
      const media = new TestMedia();
      expect(media.error).toBeNull();
      media.destroy();
    });

    it('surfaces the audio verdict as an ErrorLike and fires error', async () => {
      const media = new TestMedia();
      const fired: Event[] = [];
      media.addEventListener('error', (event) => fired.push(event));

      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_AUDIO_TRACK }]);
      await flush();

      expect(fired).toHaveLength(1);
      // No message: the consumer localizes from the code.
      expect(media.error).toEqual({ code: SVTA_NO_SUPPORTED_AUDIO_TRACK, message: '' });
      media.destroy();
    });

    it('ignores the video verdict — this media has no video track to fail', async () => {
      // The whole difference in fatal policy. An audio-only engine composes no
      // video selection, so a video verdict can't be about anything here, and
      // surfacing it would describe a track type this media doesn't have.
      const media = new TestMedia();
      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();

      expect(media.error).toBeNull();
      media.destroy();
    });

    it('surfaces the unsupported-playback-feature code when a cause explains the verdict', async () => {
      const media = new TestMedia();
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_AUDIO_FORMAT, data: { trackType: 'audio', trackId: 'a1', mimeType: 'audio/aac' } },
        { code: SVTA_NO_SUPPORTED_AUDIO_TRACK },
      ]);
      await flush();

      expect(media.error?.code).toBe(SVTA_UNSUPPORTED_PLAYBACK_FEATURE);
      expect(media.error?.message).toBe('');
      media.destroy();
    });

    it('logs the refusal', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const media = new TestMedia();
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'audio', trackId: 'a1' } },
        { code: SVTA_NO_SUPPORTED_AUDIO_TRACK },
      ]);
      await flush();

      const logged = spy.mock.calls
        .map((call) => String(call[0]))
        .filter((text) => text.startsWith(UNSUPPORTED_PLAYBACK_FEATURE_MESSAGE));
      expect(logged).toHaveLength(1);
      vi.restoreAllMocks();
      media.destroy();
    });

    it('stops promoting conditions after destroy', async () => {
      const media = new TestMedia();
      media.destroy();

      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_AUDIO_TRACK }]);
      await flush();

      expect(media.error).toBeNull();
    });
  });
});
