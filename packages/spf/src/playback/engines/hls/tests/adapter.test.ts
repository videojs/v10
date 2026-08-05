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
import {
  SVTA_NO_SUPPORTED_AUDIO_TRACK,
  SVTA_NO_SUPPORTED_VIDEO_TRACK,
  SVTA_UNSUPPORTED_AUDIO_FORMAT,
  SVTA_UNSUPPORTED_DRM_SYSTEM,
  SVTA_UNSUPPORTED_VIDEO_FORMAT,
  type SvtaError,
} from '../../../../media/errors';
import { MEDIA_PLAYLIST_METADATA_KEY, type Presentation } from '../../../../media/types';
import { SimpleHlsMediaElement, SimpleHlsMediaMixin } from '../adapter';

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
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v.m3u8');
    });

    it('synchronously updates engine presentation state when src changes', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v2.m3u8');
    });

    it('clears engine presentation state when src is set to empty string', () => {
      const media = new SimpleHlsMediaElement();
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

    it('reuses the same engine instance when src is set', () => {
      const media = new SimpleHlsMediaElement();
      const initial = media.engine;
      media.src = 'https://example.com/v1.m3u8';
      expect(media.engine).toBe(initial);
    });

    it('reuses the same engine instance when src changes', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      const engine = media.engine;
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine).toBe(engine);
    });

    it('does not destroy the engine when src changes', () => {
      const media = new SimpleHlsMediaElement();
      media.src = 'https://example.com/v1.m3u8';
      const spy = vi.spyOn(media.engine, 'destroy');
      media.src = 'https://example.com/v2.m3u8';
      expect(spy).not.toHaveBeenCalled();
    });

    it('keeps the attached media element across src changes', () => {
      const media = new SimpleHlsMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.src = 'https://example.com/v1.m3u8';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine.context.mediaElement.get()).toBe(el);
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
      expect(media.engine.context.mediaElement.get()).toBe(el);
    });

    it('clears mediaElement in owners when detached', () => {
      const media = new SimpleHlsMediaElement();
      media.attach(document.createElement('video'));
      media.detach();
      expect(media.engine.context.mediaElement.get()).toBeUndefined();
    });

    it('updates mediaElement when re-attached to a different element', () => {
      const media = new SimpleHlsMediaElement();
      const el1 = document.createElement('video');
      const el2 = document.createElement('video');
      media.attach(el1);
      media.attach(el2);
      expect(media.engine.context.mediaElement.get()).toBe(el2);
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
      expect(media.engine.state.presentation.get()?.url).toBe('https://example.com/v.m3u8');
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

    it('sets loadActivated on engine state when called', () => {
      const media = new SimpleHlsMediaElement();
      media.attach(document.createElement('video'));
      media.play().catch(() => {});
      expect(media.engine.state.loadActivated.get()).toBe(true);
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
      expect(media.engine.state.preload.get()).toBe('none');
    });

    it('setting preload to empty string resets the stored value but does not clear current engine state', () => {
      const media = new SimpleHlsMediaElement();
      media.preload = 'auto';
      media.preload = '';
      // '' only clears #preload so the next engine recreation won't re-apply
      // an explicit value — it does not patch the current engine state.
      expect(media.engine.state.preload.get()).toBe('auto');
    });

    it('survives src reassignment — explicit preload persists on the recycled engine', () => {
      const media = new SimpleHlsMediaElement();
      media.preload = 'none';
      media.src = 'https://example.com/v.m3u8';
      expect(media.preload).toBe('none');
      expect(media.engine.state.preload.get()).toBe('none');
    });

    it('keeps explicit preload in engine state across src changes', () => {
      const media = new SimpleHlsMediaElement();
      const el = document.createElement('video');
      media.attach(el);
      media.preload = 'none';
      media.src = 'https://example.com/v.m3u8';
      // The engine is recycled, so state.preload is engine-wide preference that
      // simply persists across the src change — no re-application needed.
      expect(media.engine.state.preload.get()).toBe('none');

      // Changing preload, then changing src again, keeps the latest value on the
      // same engine — not reset to a default by the source change.
      media.preload = 'auto';
      media.src = 'https://example.com/v2.m3u8';
      expect(media.engine.state.preload.get()).toBe('auto');
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

  // ---------------------------------------------------------------------------
  // Live surface — streamType / targetLiveWindow / liveEdgeStart
  // (the contract the player store's stream-type + live features consume)
  // ---------------------------------------------------------------------------
  describe('live surface', () => {
    // The mixin dispatches change events via the base's EventTarget; the bare
    // SimpleHlsMediaElement has none, so tests compose over EventTarget.
    class TestMedia extends SimpleHlsMediaMixin(EventTarget) {}

    /**
     * A resolved live presentation: one selected video track, 5×2s segments at
     * [100, 110], targetDuration 2 (→ HOLD-BACK latency 6 → liveEdgeStart 104).
     */
    function liveVideoPresentation(playlistType?: 'VOD' | 'EVENT'): Presentation {
      const complete = playlistType === 'VOD';
      const video = {
        type: 'video',
        id: 'v-1',
        url: 'https://example.com/video.m3u8',
        mimeType: 'video/mp4',
        codecs: ['avc1.640020'],
        bandwidth: 1_000_000,
        initialization: { url: 'https://example.com/init.mp4' },
        duration: complete ? 10 : Number.POSITIVE_INFINITY,
        startTime: 0,
        segments: [100, 102, 104, 106, 108].map((startTime, i) => ({
          id: `seg-${i}`,
          url: `https://example.com/${i}.m4s`,
          duration: 2,
          startTime,
        })),
        metadata: {
          [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence: 0, targetDuration: 2, playlistType, endList: complete },
        },
      };
      return {
        id: 'pres-1',
        url: 'https://example.com/master.m3u8',
        startTime: 0,
        streamType: playlistType === 'VOD' ? 'on-demand' : 'live',
        selectionSets: [
          { id: 'video-set', type: 'video', switchingSets: [{ id: 'vs', type: 'video', tracks: [video] }] },
        ],
      } as Presentation;
    }

    function liveMedia(playlistType?: 'VOD' | 'EVENT') {
      const media = new TestMedia();
      media.engine.state.presentation.set(liveVideoPresentation(playlistType));
      media.engine.state.selectedVideoTrackId.set('v-1');
      return media;
    }

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('starts unknown / NaN before anything resolves', () => {
      const media = new TestMedia();
      expect(media.streamType).toBe('unknown');
      expect(media.targetLiveWindow).toBeNaN();
      expect(media.liveEdgeStart).toBeNaN();
      media.destroy();
    });

    it('detects live: streamType live, targetLiveWindow 0, with change events', async () => {
      const media = new TestMedia();
      const streamTypeChange = vi.fn();
      const targetLiveWindowChange = vi.fn();
      media.addEventListener('streamtypechange', streamTypeChange);
      media.addEventListener('targetlivewindowchange', targetLiveWindowChange);

      media.engine.state.presentation.set(liveVideoPresentation());
      media.engine.state.selectedVideoTrackId.set('v-1');
      await flush();

      expect(media.streamType).toBe('live');
      expect(media.targetLiveWindow).toBe(0);
      expect(streamTypeChange).toHaveBeenCalledTimes(1);
      expect(targetLiveWindowChange).toHaveBeenCalledTimes(1);
      media.destroy();
    });

    it('reports Infinity targetLiveWindow for an EVENT (DVR) playlist', async () => {
      const media = liveMedia('EVENT');
      await flush();
      expect(media.streamType).toBe('live');
      expect(media.targetLiveWindow).toBe(Number.POSITIVE_INFINITY);
      media.destroy();
    });

    it('reports on-demand / NaN for a VOD playlist', async () => {
      const media = liveMedia('VOD');
      await flush();
      expect(media.streamType).toBe('on-demand');
      expect(media.targetLiveWindow).toBeNaN();
      expect(media.liveEdgeStart).toBeNaN();
      media.destroy();
    });

    it('derives liveEdgeStart at read time: window end minus HOLD-BACK, sliding with the window', async () => {
      const media = liveMedia();
      await flush();
      // Window [100, 110], HOLD-BACK 3 × targetDuration(2) = 6 → 104.
      expect(media.liveEdgeStart).toBe(104);

      // The window slides (reload): derived value follows with no event needed.
      const slid = liveVideoPresentation();
      const track = slid.selectionSets[0]!.switchingSets[0]!.tracks[0] as { segments: { startTime: number }[] };
      for (const segment of track.segments) segment.startTime += 10;
      media.engine.state.presentation.set(slid);
      expect(media.liveEdgeStart).toBe(114);
      media.destroy();
    });

    it('supports a user streamType override, reverting on unknown', async () => {
      const media = liveMedia();
      await flush();
      expect(media.streamType).toBe('live');

      media.streamType = 'on-demand'; // pin
      expect(media.streamType).toBe('on-demand');

      // Detection updates don't displace the pin.
      media.engine.state.presentation.set(liveVideoPresentation());
      await flush();
      expect(media.streamType).toBe('on-demand');

      media.streamType = 'unknown'; // revert to detected
      expect(media.streamType).toBe('live');
      media.destroy();
    });

    it('resets to unknown / NaN when the source is cleared', async () => {
      const media = liveMedia();
      await flush();
      expect(media.streamType).toBe('live');

      media.src = '';
      await flush();
      expect(media.streamType).toBe('unknown');
      expect(media.targetLiveWindow).toBeNaN();
      expect(media.liveEdgeStart).toBeNaN();
      media.destroy();
    });
  });
  // ---------------------------------------------------------------------------
  // Error surface — error / 'error' event
  // (the MediaErrorCapability contract the player store's error feature consumes)
  // ---------------------------------------------------------------------------
  describe('error surface', () => {
    class TestMedia extends SimpleHlsMediaMixin(EventTarget) {}

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('exposes no error before anything is reported', () => {
      const media = new TestMedia();
      expect(media.error).toBeNull();
      media.destroy();
    });

    it('surfaces a reported fatal condition as an ErrorLike and fires error', async () => {
      const media = new TestMedia();
      const fired: Event[] = [];
      media.addEventListener('error', (event) => fired.push(event));

      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();

      expect(media.error).toEqual({ code: SVTA_NO_SUPPORTED_VIDEO_TRACK, message: expect.any(String) });
      expect(media.error?.message).not.toBe('');
      expect(fired).toHaveLength(1);
      media.destroy();
    });

    it('surfaces the first fatal condition — the root cause, not the consequence', async () => {
      const media = new TestMedia();
      // A reporter states the cause before selection reports the consequence;
      // sequence order is causal, so the first fatal is the actionable one.
      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_AUDIO_TRACK }, { code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();

      expect(media.error?.code).toBe(SVTA_NO_SUPPORTED_AUDIO_TRACK);
      media.destroy();
    });

    it('ignores non-fatal reports — they stay in the sequence only', async () => {
      const media = new TestMedia();
      const fired: Event[] = [];
      media.addEventListener('error', (event) => fired.push(event));

      // 2039 (manifest feature unsupported) is the degraded-but-playable tier;
      // it must not reach the media surface.
      media.engine.state.errors.set([{ code: 2039 }]);
      await flush();

      expect(media.error).toBeNull();
      expect(fired).toHaveLength(0);
      media.destroy();
    });

    it('fires once per distinct condition, not per re-report', async () => {
      const media = new TestMedia();
      const fired: Event[] = [];
      media.addEventListener('error', (event) => fired.push(event));

      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();
      // A later append (a second reporter, a re-evaluation) leaves the first
      // fatal in place; the surface must not re-fire for the same condition.
      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }, { code: 2039 }]);
      await flush();

      expect(fired).toHaveLength(1);
      media.destroy();
    });

    it('clears when the sequence resets for a new source', async () => {
      const media = new TestMedia();
      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();
      expect(media.error).not.toBeNull();

      // collectErrors clears the slot on source change.
      media.engine.state.errors.set(undefined);
      await flush();

      expect(media.error).toBeNull();
      media.destroy();
    });

    it('describes an all-encrypted source as protected, not as an unplayable format', async () => {
      const media = new TestMedia();
      // The verdict only says nothing was selectable. Every video rendition was
      // pruned for the same reason, so that reason is the honest thing to say.
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'video', trackId: 'v1' } },
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'video', trackId: 'v2' } },
        { code: SVTA_NO_SUPPORTED_VIDEO_TRACK },
      ]);
      await flush();

      expect(media.error?.code).toBe(SVTA_NO_SUPPORTED_VIDEO_TRACK);
      expect(media.error?.message).toMatch(/protected/i);
      media.destroy();
    });

    it('falls back to the verdict copy when the causes disagree', async () => {
      const media = new TestMedia();
      // One encrypted rendition and one MPEG-TS rendition: no single cause is
      // true of the source, so neither should be presented as the explanation.
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'video', trackId: 'v1' } },
        { code: SVTA_UNSUPPORTED_VIDEO_FORMAT, data: { trackType: 'video', trackId: 'v2' } },
        { code: SVTA_NO_SUPPORTED_VIDEO_TRACK },
      ]);
      await flush();

      expect(media.error?.message).not.toMatch(/protected/i);
      expect(media.error?.message).toMatch(/format/i);
      media.destroy();
    });

    it('ignores causes about a different track type', async () => {
      const media = new TestMedia();
      // Encrypted audio alongside MPEG-TS video. The video verdict must not
      // inherit the audio track's explanation.
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'audio', trackId: 'a1' } },
        { code: SVTA_UNSUPPORTED_VIDEO_FORMAT, data: { trackType: 'video', trackId: 'v1' } },
        { code: SVTA_NO_SUPPORTED_VIDEO_TRACK },
      ]);
      await flush();

      expect(media.error?.code).toBe(SVTA_NO_SUPPORTED_VIDEO_TRACK);
      expect(media.error?.message).not.toMatch(/protected/i);
      media.destroy();
    });

    it('describes an all-encrypted audio track as protected audio', async () => {
      const media = new TestMedia();
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'audio', trackId: 'a1' } },
        { code: SVTA_NO_SUPPORTED_AUDIO_TRACK },
      ]);
      await flush();

      // Asserted on claim rather than phrasing: protected, and about audio.
      expect(media.error?.message).toMatch(/protected/i);
      expect(media.error?.message).toMatch(/audio/i);
      media.destroy();
    });

    it('keeps the verdict copy when a cause carries no track type', async () => {
      const media = new TestMedia();
      // An untagged cause can't be attributed to a type, so it can't claim to
      // explain a per-type verdict.
      media.engine.state.errors.set([{ code: SVTA_UNSUPPORTED_DRM_SYSTEM }, { code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();

      expect(media.error?.message).not.toMatch(/protected/i);
      media.destroy();
    });

    it('does not rewrite copy for a cause appended after the verdict surfaced', async () => {
      const media = new TestMedia();
      const fired: Event[] = [];
      media.addEventListener('error', (event) => fired.push(event));

      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_AUDIO_FORMAT, data: { trackType: 'audio', trackId: 'a1' } },
        { code: SVTA_NO_SUPPORTED_AUDIO_TRACK },
      ]);
      await flush();
      const surfaced = media.error?.message;

      // A rendition resolving later can't retroactively change an error a
      // consumer has already shown.
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_AUDIO_FORMAT, data: { trackType: 'audio', trackId: 'a1' } },
        { code: SVTA_NO_SUPPORTED_AUDIO_TRACK },
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'audio', trackId: 'a2' } },
      ]);
      await flush();

      expect(media.error?.message).toBe(surfaced);
      expect(fired).toHaveLength(1);
      media.destroy();
    });

    it('prefers a message the reporter supplied over composed copy', async () => {
      const media = new TestMedia();
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'video', trackId: 'v1' } },
        { code: SVTA_NO_SUPPORTED_VIDEO_TRACK, message: 'Reporter knows best.' },
      ]);
      await flush();

      expect(media.error?.message).toBe('Reporter knows best.');
      media.destroy();
    });

    it('carries reporter context through as data', async () => {
      const media = new TestMedia();
      media.engine.state.errors.set([
        { code: SVTA_NO_SUPPORTED_VIDEO_TRACK, data: { selectionKey: 'selectedVideoTrackId' } },
      ]);
      await flush();

      expect(media.error?.data).toEqual({ selectionKey: 'selectedVideoTrackId' });
      media.destroy();
    });

    it('never blames the browser — the engine is what can’t play these', async () => {
      // The whole point of the copy: browsers play MPEG-TS (Safari, natively)
      // and DRM (EME). Saying "this browser can't" is false and sends a viewer
      // to a different browser that behaves identically.
      const cases: SvtaError[][] = [
        [{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }],
        [{ code: SVTA_NO_SUPPORTED_AUDIO_TRACK }],
        [
          { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'video', trackId: 'v1' } },
          { code: SVTA_NO_SUPPORTED_VIDEO_TRACK },
        ],
        [
          { code: SVTA_UNSUPPORTED_VIDEO_FORMAT, data: { trackType: 'video', trackId: 'v1', mimeType: 'video/mp2t' } },
          { code: SVTA_NO_SUPPORTED_VIDEO_TRACK },
        ],
      ];

      for (const errors of cases) {
        const media = new TestMedia();
        media.engine.state.errors.set(errors);
        await flush();

        expect(media.error?.message).not.toMatch(/browser/i);
        media.destroy();
      }
    });

    it('reuses the reporter’s stored copy when every cause said the same thing', async () => {
      // The reporter names the container because only it has the rendition's
      // mimeType. The adapter's job is to carry that through, not re-derive it.
      const media = new TestMedia();
      media.engine.state.errors.set([
        {
          code: SVTA_UNSUPPORTED_VIDEO_FORMAT,
          message: 'This player can’t play MPEG-TS video.',
          data: { trackType: 'video', trackId: 'v1', mimeType: 'video/mp2t' },
        },
        {
          code: SVTA_UNSUPPORTED_VIDEO_FORMAT,
          message: 'This player can’t play MPEG-TS video.',
          data: { trackType: 'video', trackId: 'v2', mimeType: 'video/mp2t' },
        },
        { code: SVTA_NO_SUPPORTED_VIDEO_TRACK },
      ]);
      await flush();

      expect(media.error?.message).toBe('This player can’t play MPEG-TS video.');
      media.destroy();
    });

    it('discards stored copy the causes disagree on, even under one code', async () => {
      // 1004/1005 covers every non-fMP4 container, so unanimity on the code is
      // not unanimity on what to call it. Comparing messages catches what
      // comparing codes would wrongly accept.
      const media = new TestMedia();
      media.engine.state.errors.set([
        {
          code: SVTA_UNSUPPORTED_AUDIO_FORMAT,
          message: 'This player can’t play MPEG-TS audio.',
          data: { trackType: 'audio', trackId: 'a1', mimeType: 'video/mp2t' },
        },
        {
          code: SVTA_UNSUPPORTED_AUDIO_FORMAT,
          message: 'This player can’t play raw AAC audio.',
          data: { trackType: 'audio', trackId: 'a2', mimeType: 'audio/aac' },
        },
        { code: SVTA_NO_SUPPORTED_AUDIO_TRACK },
      ]);
      await flush();

      expect(media.error?.message).not.toMatch(/MPEG-TS|raw AAC/);
      expect(media.error?.message).toMatch(/format/i);
      media.destroy();
    });

    it('composes from the code when a cause carries no stored copy', async () => {
      // A composition can supply its own reporter and omit copy. The code and
      // track type still support the generic form, which beats the verdict's.
      const media = new TestMedia();
      media.engine.state.errors.set([
        { code: SVTA_UNSUPPORTED_DRM_SYSTEM, data: { trackType: 'video', trackId: 'v1' } },
        { code: SVTA_NO_SUPPORTED_VIDEO_TRACK },
      ]);
      await flush();

      expect(media.error?.message).toMatch(/protected/i);
      media.destroy();
    });

    it('names the adapter itself by default, so copy says which engine refused', async () => {
      expect(SimpleHlsMediaElement.playerSoftwareName).toBe('simple-hls-video');

      const media = new TestMedia();
      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();

      expect(media.error?.message).toMatch(/^simple-hls-video /);
      media.destroy();
    });

    it('lets an explicit config name win over the adapter’s static', async () => {
      const media = new (class extends SimpleHlsMediaMixin(EventTarget) {})({
        config: { playerSoftwareName: 'Mux Player' },
      });
      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();

      expect(media.error?.message).toMatch(/^Mux Player /);
      media.destroy();
    });

    it('honours a subclass overriding the static', async () => {
      // Read through `this.constructor`, not the mixin closure, so a host that
      // renames the engine gets its name in the copy without touching config.
      class Renamed extends SimpleHlsMediaMixin(EventTarget) {
        static override get playerSoftwareName(): string {
          return 'Acme Player';
        }
      }
      const media = new Renamed();
      media.engine.state.errors.set([{ code: SVTA_NO_SUPPORTED_VIDEO_TRACK }]);
      await flush();

      expect(media.error?.message).toMatch(/^Acme Player /);
      media.destroy();
    });
  });
});
