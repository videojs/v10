/**
 * SimpleHlsAudioOnlyMediaElement adapter tests.
 *
 * Covers the HTMLMediaElement-compatible contract for src and play(), per the
 * WHATWG HTML spec, for the audio-only HLS variant. Parallels
 * adapter.test.ts — semantics match (the variant differs in composition,
 * not in adapter contract).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleHlsAudioOnlyMediaElement } from '../adapter-audio-only';

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
  // attach / detach
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

    it('creates a new engine when src is set', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const initial = media.engine;
      media.src = 'https://example.com/v1.m3u8';
      expect(media.engine).not.toBe(initial);
    });

    it('destroys the old engine when src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      const spy = vi.spyOn(media.engine, 'destroy');
      media.src = 'https://example.com/v2.m3u8';
      expect(spy).toHaveBeenCalledOnce();
    });

    it('re-attaches the media element to the new engine when src changes', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v1.m3u8';
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

    it('survives src reassignment — explicit preload is preserved across engine recreation', () => {
      const media = new SimpleHlsAudioOnlyMediaElement();
      media.preload = 'none';
      media.src = 'https://example.com/v.m3u8';
      expect(media.preload).toBe('none');
      expect(media.engine.state.preload.get()).toBe('none');
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
});
