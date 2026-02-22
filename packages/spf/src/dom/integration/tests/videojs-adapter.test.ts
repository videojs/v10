/**
 * SpfMedia adapter tests.
 *
 * Covers the HTMLMediaElement-compatible contract for src and play(), per the
 * WHATWG HTML spec (https://html.spec.whatwg.org/multipage/media.html).
 *
 * Notable spec anchors:
 * - src IDL attribute reflects synchronously (§4.8.11.2)
 * - Setting src invokes the load algorithm (§4.8.11.5)
 * - play() returns a Promise that resolves when playback starts (§4.8.11.8)
 *
 * Remote-source integration tests (e.g. full pipeline with Mux streams) are
 * intentionally deferred; see comments below for planned coverage.
 *
 * Future: consider web-platform-tests (wpt) fixtures for deeper spec coverage.
 */
import { describe, expect, it, vi } from 'vitest';
import { SpfMedia } from '../videojs-adapter';

describe('SpfMedia', () => {
  // ---------------------------------------------------------------------------
  // src — synchronous IDL attribute reflection (WHATWG §4.8.11.2)
  // ---------------------------------------------------------------------------
  describe('src', () => {
    it('returns empty string before any src is set', () => {
      const media = new SpfMedia();
      expect(media.src).toBe('');
    });

    it('reflects the set value synchronously', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v.m3u8';
      // Must be synchronous — no await needed
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('reflects the most recently set value', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.src).toBe('https://example.com/v2.m3u8');
    });

    it('reflects empty string when set to empty', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.src).toBe('');
    });

    // Setting src triggers the load algorithm — engine state update is synchronous
    it('synchronously updates engine presentation state when src is set', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v.m3u8';
      expect(media.engine.state.current.presentation?.url).toBe('https://example.com/v.m3u8');
    });

    it('synchronously updates engine presentation state when src changes', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine.state.current.presentation?.url).toBe('https://example.com/v2.m3u8');
    });

    it('clears engine presentation state when src is set to empty string', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.engine.state.current.presentation).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // attach / detach — media element lifecycle (reuses the same engine)
  // ---------------------------------------------------------------------------
  describe('attach / detach', () => {
    it('exposes the engine immediately (created at construction, not on attach)', () => {
      const media = new SpfMedia();
      expect(media.engine).not.toBeNull();
    });

    it('reuses the same engine instance across attach calls', () => {
      const media = new SpfMedia();
      const el1 = document.createElement('video');
      const el2 = document.createElement('video');
      media.attach(el1);
      const engineAfterFirstAttach = media.engine;
      media.attach(el2);
      expect(media.engine).toBe(engineAfterFirstAttach);
    });

    it('reuses the same engine instance across attach/detach cycles', () => {
      const media = new SpfMedia();
      media.attach(document.createElement('video'));
      const engine = media.engine;
      media.detach();
      media.attach(document.createElement('video'));
      expect(media.engine).toBe(engine);
    });

    it('sets mediaElement in owners when attached', () => {
      const media = new SpfMedia();
      const el = document.createElement('video');
      media.attach(el);
      expect(media.engine.owners.current.mediaElement).toBe(el);
    });

    it('clears mediaElement in owners when detached', () => {
      const media = new SpfMedia();
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.engine.owners.current.mediaElement).toBeUndefined();
    });

    it('updates mediaElement when re-attached to a different element', () => {
      const media = new SpfMedia();
      const el1 = document.createElement('video');
      const el2 = document.createElement('video');
      media.attach(el1);
      media.attach(el2);
      expect(media.engine.owners.current.mediaElement).toBe(el2);
    });

    it('preserves src across attach/detach cycles', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v.m3u8';
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('src set before attach is reflected in engine state', () => {
      const media = new SpfMedia();
      media.src = 'https://example.com/v.m3u8';
      media.attach(document.createElement('video'));
      expect(media.engine.state.current.presentation?.url).toBe('https://example.com/v.m3u8');
    });

    it('detach does not destroy the engine', () => {
      const media = new SpfMedia();
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
      const media = new SpfMedia();
      media.attach(document.createElement('video'));
      const result = media.play();
      expect(result).toBeInstanceOf(Promise);
      // Prevent unhandled rejection — play without src is expected to fail
      result.catch(() => {});
    });

    it('sets playbackInitiated on engine state when called', () => {
      const media = new SpfMedia();
      media.attach(document.createElement('video'));
      media.play().catch(() => {});
      expect(media.engine.state.current.playbackInitiated).toBe(true);
    });

    it('retries play() via loadstart when element has no src but adapter has one', async () => {
      const media = new SpfMedia();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v.m3u8';

      // Simulate element having no blob URL yet on first call, as if MSE
      // hasn't attached yet, then succeed on retry
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

      // Push past all pending microtasks (state flush + .catch() handler)
      // before dispatching loadstart so the listener is registered in time
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      // Simulate MSE attaching the blob URL
      el.dispatchEvent(new Event('loadstart'));

      await playPromise.catch(() => {});
      expect(playCallCount).toBe(2);
    });

    it('re-throws when play() rejects and no adapter src is set', async () => {
      const media = new SpfMedia();
      const el = document.createElement('video');
      media.attach(el);
      // No src on adapter — nothing pending to wait for

      const err = new Error('autoplay policy');
      el.play = () => Promise.reject(err);

      await expect(media.play()).rejects.toThrow('autoplay policy');
    });

    it('removes the pending loadstart listener on detach', async () => {
      const media = new SpfMedia();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v.m3u8';

      el.play = () => Promise.reject(new Error('no supported sources'));
      media.play().catch(() => {});

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const spy = vi.spyOn(el, 'removeEventListener');
      media.detach();

      expect(spy).toHaveBeenCalledWith('loadstart', expect.any(Function));
    });

    it('removes the pending loadstart listener on destroy', async () => {
      const media = new SpfMedia();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v.m3u8';

      el.play = () => Promise.reject(new Error('no supported sources'));
      media.play().catch(() => {});

      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const spy = vi.spyOn(el, 'removeEventListener');
      media.destroy();

      expect(spy).toHaveBeenCalledWith('loadstart', expect.any(Function));
    });

    // TODO: Add integration tests with a real HLS stream once test fixtures are
    // in place (e.g. Mux stream, WPT-style fixture server).
    // Expected: play() resolves after the media element fires 'playing'.
  });

  // ---------------------------------------------------------------------------
  // destroy() — explicit teardown (separate from detach)
  // ---------------------------------------------------------------------------
  describe('destroy()', () => {
    it('destroys the underlying engine', () => {
      const media = new SpfMedia();
      const spy = vi.spyOn(media.engine, 'destroy');
      media.destroy();
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
