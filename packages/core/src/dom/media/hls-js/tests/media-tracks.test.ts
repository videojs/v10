import Hls from 'hls.js';
import { describe, expect, it } from 'vitest';
import { MediaTracksMixin } from '../../../../core/media/media-tracks';
import { HTMLVideoElementHost } from '../../video-host';
import { HlsJsMediaMediaTracksMixin } from '../media-tracks';

class FakeHost extends HTMLVideoElementHost {
  engine: Hls | null;

  constructor(engine: Hls | null = null) {
    super();
    this.engine = engine;
  }
}

const HlsJsMediaMediaTracks = HlsJsMediaMediaTracksMixin(MediaTracksMixin(FakeHost));

function createEngine(): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  return {
    audioTracks: [{ id: 0 }, { id: 1 }],
    audioTrack: 0,
    nextLevel: -1,
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

const manifestParsed = (engine: Hls, levels: Array<Record<string, unknown>>) =>
  (engine as any).emit(Hls.Events.MANIFEST_PARSED, { levels });

const audioTracksUpdated = (engine: Hls, audioTracks: Array<Record<string, unknown>>) =>
  (engine as any).emit(Hls.Events.AUDIO_TRACKS_UPDATED, { audioTracks });

function flush() {
  return Promise.resolve();
}

describe('HlsJsMediaMediaTracksMixin', () => {
  it('mirrors manifest levels into a selected video track with renditions', () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    manifestParsed(engine, [
      { url: ['high.m3u8'], width: 1920, height: 1080, videoCodec: 'avc1', bitrate: 6_000_000 },
      { url: ['low.m3u8'], width: 640, height: 360, videoCodec: 'avc1', bitrate: 800_000 },
    ]);

    expect(host.videoTracks.length).toBe(1);
    expect(host.videoTracks[0]?.selected).toBe(true);
    expect(host.videoRenditions.length).toBe(2);
    expect([...host.videoRenditions].map((rendition) => rendition.id)).toEqual(['0', '1']);
    expect([...host.videoRenditions].map((rendition) => rendition.height)).toEqual([1080, 360]);
  });

  it('mirrors alternate audio tracks and enables the default', () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    audioTracksUpdated(engine, [
      { id: 0, default: true, name: 'English', lang: 'en' },
      { id: 1, name: 'Spanish', lang: 'es' },
    ]);

    expect(host.audioTracks.length).toBe(2);
    expect(host.audioTracks[0]?.enabled).toBe(true);
    expect(host.audioTracks[1]?.enabled).toBe(false);
    expect(host.audioTracks[1]?.label).toBe('Spanish');
  });

  it('forwards a rendition selection to engine.nextLevel', async () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    manifestParsed(engine, [{ url: ['a'] }, { url: ['b'] }, { url: ['c'] }]);

    host.videoRenditions.selectedIndex = 2;
    await flush();

    expect(engine.nextLevel).toBe(2);
  });

  it('marks the active rendition from LEVEL_SWITCHED', () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    manifestParsed(engine, [{ url: ['a'] }, { url: ['b'] }, { url: ['c'] }]);

    (engine as any).emit(Hls.Events.LEVEL_SWITCHED, { level: 1 });

    expect([...host.videoRenditions].map((rendition) => rendition.active)).toEqual([false, true, false]);
    expect(engine.nextLevel).toBe(-1);
  });

  it('forwards an audio track selection to engine.audioTrack', async () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    audioTracksUpdated(engine, [
      { id: 0, default: true, name: 'English', lang: 'en' },
      { id: 1, name: 'Spanish', lang: 'es' },
    ]);

    const [english, spanish] = [...host.audioTracks];
    english!.enabled = false;
    spanish!.enabled = true;
    await flush();

    expect(engine.audioTrack).toBe(1);
  });

  it('prunes renditions dropped from a LEVELS_UPDATED event', () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    const levels = [{ url: ['a'] }, { url: ['b'] }, { url: ['c'] }];
    manifestParsed(engine, levels);
    expect(host.videoRenditions.length).toBe(3);

    (engine as any).emit(Hls.Events.LEVELS_UPDATED, { levels: [levels[0], levels[2]] });

    expect([...host.videoRenditions].map((rendition) => rendition.id)).toEqual(['0', '2']);
  });

  it('prunes renditions when LEVELS_UPDATED carries new level object references', () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    const levels = [{ url: ['a'] }, { url: ['b'] }, { url: ['c'] }];
    manifestParsed(engine, levels);
    expect(host.videoRenditions.length).toBe(3);

    (engine as any).emit(Hls.Events.LEVELS_UPDATED, { levels: [{ ...levels[0] }, { ...levels[2] }] });

    expect([...host.videoRenditions].map((rendition) => rendition.id)).toEqual(['0', '2']);
  });

  it('switches to the newly enabled audio track when multiple are enabled', async () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    audioTracksUpdated(engine, [
      { id: 0, default: true, name: 'English', lang: 'en' },
      { id: 1, name: 'Spanish', lang: 'es' },
    ]);

    const [english, spanish] = [...host.audioTracks];
    // Enable without disabling the current track first.
    spanish!.enabled = true;
    await flush();

    expect(engine.audioTrack).toBe(1);
    expect(english!.enabled).toBe(false);
    expect(spanish!.enabled).toBe(true);
  });

  it('clears all media tracks on DESTROYING', () => {
    const engine = createEngine();
    const host = new HlsJsMediaMediaTracks(engine);

    manifestParsed(engine, [{ url: ['a'] }]);
    audioTracksUpdated(engine, [{ id: 0, default: true }]);
    expect(host.videoTracks.length).toBe(1);
    expect(host.audioTracks.length).toBe(1);

    (engine as any).emit(Hls.Events.DESTROYING);

    expect(host.videoTracks.length).toBe(0);
    expect(host.audioTracks.length).toBe(0);
  });
});
