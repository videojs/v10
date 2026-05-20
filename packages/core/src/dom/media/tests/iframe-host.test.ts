import { afterEach, describe, expect, it, vi } from 'vitest';
import { IframeMediaHost } from '../iframe-host';

// Minimal concrete subclass used across all tests.
class TestHost extends IframeMediaHost<{ destroy: () => void }> {
  mountCalls: HTMLElement[] = [];
  unmountCalls = 0;

  #src: string | null = null;

  protected get src() {
    return this.#src;
  }

  setSrc(value: string | null) {
    this.#src = value;
  }

  protected mount(container: HTMLElement) {
    this.mountCalls.push(container);
  }

  protected unmount() {
    this.unmountCalls++;
  }

  play() {
    return Promise.resolve();
  }

  pause() {
    return Promise.resolve();
  }

  get currentTime() {
    return super.currentTime;
  }

  set currentTime(_value: number) {}

  protected onSetVolume(_value: number) {}
  protected onSetMuted(_value: boolean) {}
  protected onSetPlaybackRate(_value: number) {}

  // Expose protected API for testing.
  callUpdateEngine(engine: { destroy: () => void } | null) {
    this.updateEngine(engine);
  }

  callUpdateState(patch: Parameters<typeof this.updateState>[0]) {
    this.updateState(patch);
  }

  callResetState() {
    this.resetState();
  }

  callResetTextTracks() {
    this.resetTextTracks();
  }

  callAddMountedTrack(track: TextTrack) {
    this.addMountedTrack(track);
  }

  callIsMountedTrack(track: TextTrack) {
    return this.isMountedTrack(track);
  }

  callStartTextTrackAbort() {
    return this.startTextTrackAbort();
  }

  get exposedSyntheticVideo() {
    return this.syntheticTextTracksVideo;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IframeMediaHost', () => {
  describe('attach / detach lifecycle', () => {
    it('attach sets target to the provided container', () => {
      const host = new TestHost();
      const container = document.createElement('div');
      host.attach(container);
      expect(host.target).toBe(container);
    });

    it('attach calls mount when src is set', () => {
      const host = new TestHost();
      host.setSrc('https://example.com/video');
      const container = document.createElement('div');
      host.attach(container);
      expect(host.mountCalls).toHaveLength(1);
      expect(host.mountCalls[0]).toBe(container);
    });

    it('attach does not call mount when src is null', () => {
      const host = new TestHost();
      const container = document.createElement('div');
      host.attach(container);
      expect(host.mountCalls).toHaveLength(0);
    });

    it('attach creates an overlay div inside the container', () => {
      const host = new TestHost();
      const container = document.createElement('div');
      host.attach(container);
      const overlay = container.querySelector('div');
      expect(overlay).not.toBeNull();
      expect(overlay!.style.position).toBe('absolute');
    });

    it('detach calls unmount', () => {
      const host = new TestHost();
      host.setSrc('src');
      host.attach(document.createElement('div'));
      host.detach();
      expect(host.unmountCalls).toBe(1);
    });

    it('detach clears target', () => {
      const host = new TestHost();
      host.attach(document.createElement('div'));
      host.detach();
      expect(host.target).toBeNull();
    });

    it('detach removes the overlay', () => {
      const host = new TestHost();
      const container = document.createElement('div');
      host.attach(container);
      host.detach();
      expect(container.querySelector('div')).toBeNull();
    });
  });

  describe('destroy', () => {
    it('calls detach once', () => {
      const host = new TestHost();
      host.attach(document.createElement('div'));
      host.destroy();
      expect(host.unmountCalls).toBe(1);
    });

    it('is idempotent — second call is a no-op', () => {
      const host = new TestHost();
      host.setSrc('src');
      host.attach(document.createElement('div'));
      host.destroy();
      host.destroy();
      expect(host.unmountCalls).toBe(1);
    });
  });

  describe('load', () => {
    it('calls mount when container and src are set', () => {
      const host = new TestHost();
      host.setSrc('src');
      const container = document.createElement('div');
      host.attach(container);
      host.mountCalls.length = 0;
      host.load();
      expect(host.mountCalls).toHaveLength(1);
    });

    it('is a no-op when src is null', () => {
      const host = new TestHost();
      host.attach(document.createElement('div'));
      host.load();
      expect(host.mountCalls).toHaveLength(0);
    });

    it('is a no-op when not attached', () => {
      const host = new TestHost();
      host.setSrc('src');
      host.load();
      expect(host.mountCalls).toHaveLength(0);
    });
  });

  describe('updateEngine', () => {
    it('exposes engine via getter', () => {
      const host = new TestHost();
      const engine = { destroy: vi.fn() };
      host.callUpdateEngine(engine);
      expect(host.engine).toBe(engine);
    });

    it('accepts null to clear the engine', () => {
      const host = new TestHost();
      host.callUpdateEngine({ destroy: vi.fn() });
      host.callUpdateEngine(null);
      expect(host.engine).toBeNull();
    });
  });

  describe('updateState', () => {
    it('updates only supplied fields', () => {
      const host = new TestHost();
      host.callUpdateState({ paused: false, readyState: 4 });
      expect(host.paused).toBe(false);
      expect(host.readyState).toBe(4);
      expect(host.ended).toBe(false); // default unchanged
    });

    it('updates volume', () => {
      const host = new TestHost();
      host.callUpdateState({ volume: 0.5 });
      expect(host.volume).toBe(0.5);
    });

    it('updates muted', () => {
      const host = new TestHost();
      host.callUpdateState({ muted: true });
      expect(host.muted).toBe(true);
    });

    it('clears error when set to null', () => {
      const host = new TestHost();
      host.callUpdateState({ error: { code: 4, message: 'oops' } });
      expect(host.error).toEqual({ code: 4, message: 'oops' });
      host.callUpdateState({ error: null });
      expect(host.error).toBeNull();
    });

    it('does not touch muted when key is absent from patch', () => {
      const host = new TestHost();
      host.callUpdateState({ muted: true });
      host.callUpdateState({ volume: 0.8 }); // no muted key
      expect(host.muted).toBe(true);
    });
  });

  describe('resetState', () => {
    it('resets playback state to initial values', () => {
      const host = new TestHost();
      host.callUpdateState({ paused: false, ended: true, readyState: 4, seeking: true });
      host.callResetState();
      expect(host.paused).toBe(true);
      expect(host.ended).toBe(false);
      expect(host.readyState).toBe(0);
      expect(host.seeking).toBe(false);
    });

    it('preserves muted across reset', () => {
      const host = new TestHost();
      host.callUpdateState({ muted: true });
      host.callResetState();
      expect(host.muted).toBe(true);
    });

    it('dispatches emptied event', () => {
      const host = new TestHost();
      const handler = vi.fn();
      host.addEventListener('emptied', handler);
      host.callResetState();
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('volume / muted / playbackRate setters', () => {
    it('set volume updates cache and calls onSetVolume', () => {
      const host = new TestHost();
      const spy = vi.spyOn(host as TestHost & { onSetVolume: (v: number) => void }, 'onSetVolume');
      host.volume = 0.3;
      expect(host.volume).toBe(0.3);
      expect(spy).toHaveBeenCalledWith(0.3);
    });

    it('set muted updates cache and calls onSetMuted', () => {
      const host = new TestHost();
      const spy = vi.spyOn(host as TestHost & { onSetMuted: (v: boolean) => void }, 'onSetMuted');
      host.muted = true;
      expect(host.muted).toBe(true);
      expect(spy).toHaveBeenCalledWith(true);
    });

    it('set playbackRate updates cache and calls onSetPlaybackRate', () => {
      const host = new TestHost();
      const spy = vi.spyOn(host as TestHost & { onSetPlaybackRate: (v: number) => void }, 'onSetPlaybackRate');
      host.playbackRate = 2;
      expect(host.playbackRate).toBe(2);
      expect(spy).toHaveBeenCalledWith(2);
    });
  });

  describe('buffered / seekable', () => {
    it('buffered returns empty ranges when buffered seconds is 0', () => {
      const host = new TestHost();
      expect(host.buffered.length).toBe(0);
    });

    it('buffered returns a single range when buffered seconds > 0', () => {
      const host = new TestHost();
      host.callUpdateState({ buffered: 30 });
      expect(host.buffered.length).toBe(1);
      expect(host.buffered.start(0)).toBe(0);
      expect(host.buffered.end(0)).toBe(30);
    });

    it('seekable always returns empty ranges', () => {
      const host = new TestHost();
      expect(host.seekable.length).toBe(0);
    });
  });

  describe('picture-in-picture', () => {
    it('isPictureInPicture starts false', () => {
      const host = new TestHost();
      expect(host.isPictureInPicture).toBe(false);
    });

    it('updateState({ pip: true }) reflects in isPictureInPicture', () => {
      const host = new TestHost();
      host.callUpdateState({ pip: true });
      expect(host.isPictureInPicture).toBe(true);
    });

    it('requestPictureInPicture does not post message when isPipCapable is false', () => {
      const host = new TestHost();
      const container = document.createElement('div');
      host.attach(container);
      const iframe = document.createElement('iframe');
      const postMessage = vi.fn();
      Object.defineProperty(iframe, 'src', { value: 'https://example.com', writable: false });
      Object.defineProperty(iframe, 'contentWindow', { value: { postMessage }, writable: false });
      container.appendChild(iframe);

      host.requestPictureInPicture();

      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  describe('textTracks / syntheticTextTracksVideo', () => {
    it('textTracks returns the synthetic video textTracks', () => {
      const host = new TestHost();
      expect(host.textTracks).toBe(host.exposedSyntheticVideo.textTracks);
    });

    it('syntheticTextTracksVideo always returns the same element', () => {
      const host = new TestHost();
      expect(host.exposedSyntheticVideo).toBe(host.exposedSyntheticVideo);
    });
  });

  describe('text track helpers', () => {
    it('addMountedTrack / isMountedTrack round-trips', () => {
      const host = new TestHost();
      const track = {} as TextTrack;
      expect(host.callIsMountedTrack(track)).toBe(false);
      host.callAddMountedTrack(track);
      expect(host.callIsMountedTrack(track)).toBe(true);
    });

    it('resetTextTracks disables all mounted tracks and clears the list', () => {
      const host = new TestHost();
      const track = { mode: 'showing' as TextTrackMode } as TextTrack;
      host.callAddMountedTrack(track);
      host.callResetTextTracks();
      expect(track.mode).toBe('disabled');
      expect(host.callIsMountedTrack(track)).toBe(false);
    });

    it('resetTextTracks replaces the synthetic video so old tracks do not persist into the next load', () => {
      const host = new TestHost();
      const videoBefore = host.exposedSyntheticVideo;
      host.callResetTextTracks();
      expect(host.exposedSyntheticVideo).not.toBe(videoBefore);
    });

    it('startTextTrackAbort returns an AbortController and aborts previous one', () => {
      const host = new TestHost();
      const first = host.callStartTextTrackAbort();
      const second = host.callStartTextTrackAbort();
      expect(first.signal.aborted).toBe(true);
      expect(second.signal.aborted).toBe(false);
    });
  });
});
