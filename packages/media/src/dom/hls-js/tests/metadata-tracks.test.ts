import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';
import { describe, expect, it } from 'vitest';
import { HlsJsMediaMetadataTracksMixin } from '../metadata-tracks';
import type { HlsEngineHost } from '../types';

function createEngine(): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  return {
    on(event: string, fn: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    },
    emit(event: string, ...args: any[]) {
      for (const fn of listeners.get(event) ?? []) fn(event, ...args);
    },
  } as unknown as Hls;
}

class FakeHost extends EventTarget {
  engine: Hls | null;
  target: HTMLMediaElement | null = null;

  constructor(engine: Hls | null = null) {
    super();
    this.engine = engine;
  }
}

const MetadataTracksHost = HlsJsMediaMetadataTracksMixin(
  FakeHost as unknown as Constructor<HlsEngineHost>
) as unknown as typeof FakeHost;

describe('HlsJsMediaMetadataTracksMixin', () => {
  it.each([Hls.Events.MANIFEST_LOADED, Hls.Events.MEDIA_ATTACHED])(
    'loads a default chapters track as hidden after %s',
    (event) => {
      const engine = createEngine();
      const host = new MetadataTracksHost(engine);
      const video = document.createElement('video');
      const trackEl = document.createElement('track');
      const track = { kind: 'chapters', label: 'Chapters', mode: 'disabled', cues: [] } as unknown as TextTrack;

      trackEl.kind = 'chapters';
      trackEl.label = 'Chapters';
      trackEl.default = true;
      Object.defineProperty(trackEl, 'track', { configurable: true, value: track });
      Object.defineProperty(video, 'textTracks', {
        configurable: true,
        value: {
          0: track,
          length: 1,
          *[Symbol.iterator]() {
            yield track;
          },
        },
      });
      video.append(trackEl);
      host.target = video;

      (engine as any).emit(event);

      expect(track.mode).toBe('hidden');
    }
  );

  it('leaves non-default chapters tracks disabled', () => {
    const engine = createEngine();
    const host = new MetadataTracksHost(engine);
    const video = document.createElement('video');
    const trackEl = document.createElement('track');
    const track = { kind: 'chapters', label: 'Chapters', mode: 'disabled', cues: [] } as unknown as TextTrack;

    trackEl.kind = 'chapters';
    trackEl.label = 'Chapters';
    Object.defineProperty(trackEl, 'track', { configurable: true, value: track });
    Object.defineProperty(video, 'textTracks', {
      configurable: true,
      value: {
        0: track,
        length: 1,
        *[Symbol.iterator]() {
          yield track;
        },
      },
    });
    video.append(trackEl);
    host.target = video;

    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    expect(track.mode).toBe('disabled');
  });
});
