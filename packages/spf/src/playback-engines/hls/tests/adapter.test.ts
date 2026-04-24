/**
 * SimpleHlsMediaElement adapter tests.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleHlsMediaElement } from '../adapter';

describe('SimpleHlsMediaElement', () => {
  // Prevent real network calls from engines that auto-trigger resolution
  // (e.g. when a media element with default preload="auto" is attached alongside a src).
  // A never-settling promise avoids unhandled rejections without affecting test assertions.
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
      const media = new SimpleHlsMediaElement();
      expect(media.src).toBe('');
    });

    it('reflects the set value synchronously', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v.m3u8';
      // Must be synchronous — no await needed
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('reflects the most recently set value', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.src).toBe('https://example.com/v2.m3u8');
    });

    it('reflects empty string when set to empty', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.src).toBe('');
    });

    // Setting src triggers the load algorithm — engine state update is synchronous
    it('synchronously updates engine presentation state when src is set', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v.m3u8';
      expect(media.engine.state.get().presentation?.url).toBe('https://example.com/v.m3u8');
    });

    it('synchronously updates engine presentation state when src changes', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine.state.get().presentation?.url).toBe('https://example.com/v2.m3u8');
    });

    it('clears engine presentation state when src is set to empty string', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.src = '';
      expect(media.engine.state.get().presentation).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // attach / detach — media element lifecycle (reuses the same engine)
  // ---------------------------------------------------------------------------
  describe('attach / detach', () => {
    it('exposes the engine immediately (created at construction, not on attach)', () => {
      const media = new SimpleHlsMediaElement();
      expect(media.engine).not.toBeNull();
    });

    it('reuses the same engine instance across attach calls', () => {
      const media = new SimpleHlsMediaElement();
      const el1 = document.createElement('video');
      const el2 = document.createElement('video');
      media.attach(el1);
      const engineAfterFirstAttach = media.engine;
      media.attach(el2);
      expect(media.engine).toBe(engineAfterFirstAttach);
    });

    it('reuses the same engine instance across attach/detach cycles', () => {
      const media = new SimpleHlsMediaElement();
      media.attach(document.createElement('video'));
      const engine = media.engine;
      media.detach();
      media.attach(document.createElement('video'));
      expect(media.engine).toBe(engine);
    });

    it('creates a new engine when src is set', () => {
      const media = new SimpleHlsMediaElement();
      const initial = media.engine;
      media.src = 'https://example.com/v1.m3u8';
      expect(media.engine).not.toBe(initial);
    });

    it('destroys the old engine when src changes', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      const spy = vi.spyOn(media.engine, 'destroy');
      media.src = 'https://example.com/v2.m3u8';
      expect(spy).toHaveBeenCalledOnce();
    });

    it('re-attaches the media element to the new engine when src changes', () => {
      const media = new SimpleHlsMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v1.m3u8';
      expect(media.engine.owners.get().mediaElement).toBe(el);
    });

    it('cancels pending play listener when src changes', async () => {
      const media = new SimpleHlsMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v1.m3u8';
      el.play = () => Promise.reject(new Error('no supported sources'));
      media.play().catch(() => {});
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      const spy = vi.spyOn(el, 'removeEventListener');
      media.src = 'https://example.com/v2.m3u8';
      expect(spy).toHaveBeenCalledWith('loadstart', expect.any(Function));
    });

    it('sets mediaElement in owners when attached', () => {
      const media = new SimpleHlsMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      expect(media.engine.owners.get().mediaElement).toBe(el);
    });

    it('clears mediaElement in owners when detached', () => {
      const media = new SimpleHlsMediaElement();
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.engine.owners.get().mediaElement).toBeUndefined();
    });

    it('updates mediaElement when re-attached to a different element', () => {
      const media = new SimpleHlsMediaElement();
      const el1 = document.createElement('video');
      const el2 = document.createElement('video');
      media.attach(el1);
      media.attach(el2);
      expect(media.engine.owners.get().mediaElement).toBe(el2);
    });

    it('preserves src across attach/detach cycles', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.src).toBe('https://example.com/v.m3u8');
    });

    it('src set before attach is reflected in engine state', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v.m3u8';
      media.attach(document.createElement('video'));
      expect(media.engine.state.get().presentation?.url).toBe('https://example.com/v.m3u8');
    });

    it('detach does not destroy the engine', () => {
      const media = new SimpleHlsMediaElement();
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
      const media = new SimpleHlsMediaElement();
      media.attach(document.createElement('video'));
      const result = media.play();
      expect(result).toBeInstanceOf(Promise);
      // Prevent unhandled rejection — play without src is expected to fail
      result.catch(() => {});
    });

    it('sets playbackInitiated on engine state when called', () => {
      const media = new SimpleHlsMediaElement();
      media.attach(document.createElement('video'));
      media.play().catch(() => {});
      expect(media.engine.state.get().playbackInitiated).toBe(true);
    });

    it('retries play() via loadstart when element has no src but adapter has one', async () => {
      const media = new SimpleHlsMediaElement();
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
      const media = new SimpleHlsMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      // No src on adapter — nothing pending to wait for

      const err = new Error('autoplay policy');
      el.play = () => Promise.reject(err);

      await expect(media.play()).rejects.toThrow('autoplay policy');
    });

    it('removes the pending loadstart listener on detach', async () => {
      const media = new SimpleHlsMediaElement();
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
      const media = new SimpleHlsMediaElement();
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
  // preload — synchronous IDL attribute (WHATWG §4.8.11.2)
  // ---------------------------------------------------------------------------
  describe('preload', () => {
    it('returns empty string before any preload is set', () => {
      const media = new SimpleHlsMediaElement();
      expect(media.preload).toBe('');
    });

    it('reflects the set value synchronously', () => {
      const media = new SimpleHlsMediaElement();
      media.preload = 'auto';
      expect(media.preload).toBe('auto');
    });

    it('updates engine state immediately when set', () => {
      const media = new SimpleHlsMediaElement();
      media.preload = 'none';
      expect(media.engine.state.get().preload).toBe('none');
    });

    it('setting preload to empty string resets the stored value but does not clear current engine state', () => {
      const media = new SimpleHlsMediaElement();
      media.preload = 'auto';
      media.preload = '';
      // '' only clears #preload so the next engine recreation won't re-apply
      // an explicit value — it does not patch the current engine state.
      expect(media.engine.state.get().preload).toBe('auto');
    });

    it('survives src reassignment — explicit preload is preserved across engine recreation', () => {
      const media = new SimpleHlsMediaElement();
      media.preload = 'none';
      media.src = 'https://example.com/v.m3u8';
      expect(media.preload).toBe('none');
      expect(media.engine.state.get().preload).toBe('none');
    });

    it('explicit preload is re-applied before owners.patch on src change so syncPreloadAttribute skips inference', () => {
      const media = new SimpleHlsMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.preload = 'none';
      media.src = 'https://example.com/v.m3u8';
      // syncPreloadAttribute fires when owners.patch re-attaches the element,
      // but since preload was already patched into the new engine's state, it skips.
      expect(media.engine.state.get().preload).toBe('none');
    });
  });

  // ---------------------------------------------------------------------------
  // destroy() — explicit teardown (separate from detach)
  // ---------------------------------------------------------------------------
  describe('destroy()', () => {
    it('destroys the underlying engine', () => {
      const media = new SimpleHlsMediaElement();
      const spy = vi.spyOn(media.engine, 'destroy');
      media.destroy();
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
