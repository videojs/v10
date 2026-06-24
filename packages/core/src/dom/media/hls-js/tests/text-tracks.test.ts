import Hls from 'hls.js';
import { describe, expect, it } from 'vitest';
import { HTMLVideoElementHost } from '../../video-host';
import { HlsJsMediaTextTracksMixin } from '../text-tracks';

class FakeHost extends HTMLVideoElementHost {
  engine: Hls | null;

  constructor(engine: Hls | null = null) {
    super();
    this.engine = engine;
  }
}

const HlsJsMediaTextTracks = HlsJsMediaTextTracksMixin(FakeHost);

function createEngine(): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  return {
    subtitleTracks: [],
    subtitleTrack: -1,
    on(event: string, fn: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    },
    once(event: string, fn: (...args: any[]) => void) {
      const wrapped = (...args: any[]) => {
        listeners.get(event)?.delete(wrapped);
        fn(...args);
      };
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(wrapped);
    },
    off(event: string, fn: (...args: any[]) => void) {
      listeners.get(event)?.delete(fn);
    },
    emit(event: string, ...args: any[]) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn(event, ...args);
    },
  } as unknown as Hls;
}

// jsdom's TextTrackList doesn't implement EventTarget, which `#init` needs.
function mockTextTracks(video: HTMLVideoElement): void {
  const list = Object.assign(new EventTarget(), {
    length: 0,
    getTrackById: () => null,
    [Symbol.iterator]: function* () {},
  });
  Object.defineProperty(video, 'textTracks', { configurable: true, value: list });
}

function addRemovableTrack(video: HTMLVideoElement, kind: string, label = ''): HTMLTrackElement {
  const trackEl = document.createElement('track');
  trackEl.kind = kind;
  if (label) trackEl.label = label;
  trackEl.setAttribute('data-removeondestroy', '');
  video.append(trackEl);
  return trackEl;
}

describe('HlsJsMediaTextTracksMixin', () => {
  it('removes its own subtitle tracks but keeps other removable tracks when non-native tracks are found', () => {
    const engine = createEngine();
    const host = new HlsJsMediaTextTracks(engine);
    const video = document.createElement('video');
    mockTextTracks(video);

    host.attach(video);
    // Registers the NON_NATIVE_TEXT_TRACKS_FOUND handler.
    (engine as unknown as { emit(event: string, ...args: any[]): void }).emit(Hls.Events.MEDIA_ATTACHED);

    // A cue points metadata track owned by the CuePoints component.
    const cueTrack = addRemovableTrack(video, 'metadata', 'cuepoints');
    // A stale subtitle track this mixin owns.
    const staleSubtitle = addRemovableTrack(video, 'subtitles');

    (engine as unknown as { emit(event: string, ...args: any[]): void }).emit(Hls.Events.NON_NATIVE_TEXT_TRACKS_FOUND, {
      tracks: [],
    });

    expect(video.contains(cueTrack)).toBe(true);
    expect(video.contains(staleSubtitle)).toBe(false);
  });
});
