import { HTMLVideoAdapter } from '@videojs/media/dom';
import Hls from 'hls.js';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { HlsJsChaptersMixin } from '../chapters';

// The loader (fetch, parse, project) is shared with native playback and
// covered there; here only what the mixin hands it is observed.
const loader = vi.hoisted(() => ({ load: vi.fn(), reset: vi.fn() }));

vi.mock('@videojs/native-hls-video', () => ({
  HlsChaptersLoader: class {
    load = loader.load;
    reset = loader.reset;
  },
}));

function createEngine(): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  return {
    on(event: string, fn: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());

      listeners.get(event)!.add(fn);
    },
    off(event: string, fn: (...args: any[]) => void) {
      listeners.get(event)?.delete(fn);
    },
    emit(event: string, ...args: any[]) {
      for (const fn of listeners.get(event) ?? []) fn(event, ...args);
    },
  } as unknown as Hls;
}

class FakeHost extends HTMLVideoAdapter {
  engine: Hls | null;

  constructor(engine: Hls | null = null) {
    super();
    this.engine = engine;
  }
}

const HlsJsChapters = HlsJsChaptersMixin(FakeHost);

function emit(engine: Hls, event: string, data: unknown = {}) {
  (engine as any).emit(event, data);
}

function manifestLoaded(sessionData: Record<string, Record<string, string>> | null, url: string) {
  return { sessionData, url };
}

const CHAPTERS_ENTRY = { 'DATA-ID': 'com.apple.hls.chapters', URI: 'chapters.json' };

beforeEach(() => {
  loader.load.mockClear();
  loader.reset.mockClear();
});

describe('HlsJsChaptersMixin', () => {
  it('loads the chapters document the manifest references, against the manifest response URL', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    host.attach(video);
    emit(
      engine,
      Hls.Events.MANIFEST_LOADED,
      manifestLoaded({ 'com.apple.hls.chapters': CHAPTERS_ENTRY }, 'https://cdn.example.com/redirected/main.m3u8')
    );

    expect(loader.load).toHaveBeenCalledWith(video, 'chapters.json', 'https://cdn.example.com/redirected/main.m3u8');
  });

  it('does nothing for a manifest without a chapters URI', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);

    host.attach(document.createElement('video'));
    emit(engine, Hls.Events.MANIFEST_LOADED, manifestLoaded(null, 'https://example.com/main.m3u8'));
    emit(
      engine,
      Hls.Events.MANIFEST_LOADED,
      manifestLoaded(
        { 'com.apple.hls.chapters': { 'DATA-ID': 'com.apple.hls.chapters', VALUE: '[]' } },
        'https://example.com/main.m3u8'
      )
    );

    expect(loader.load).not.toHaveBeenCalled();
  });

  it('waits for media before loading a manifest that arrived first', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    emit(
      engine,
      Hls.Events.MANIFEST_LOADED,
      manifestLoaded({ 'com.apple.hls.chapters': CHAPTERS_ENTRY }, 'https://example.com/main.m3u8')
    );

    expect(loader.load).not.toHaveBeenCalled();

    host.attach(video);
    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(loader.load).toHaveBeenCalledWith(video, 'chapters.json', 'https://example.com/main.m3u8');
  });

  it('removes the tracks on detach and projects them again on reattach', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    host.attach(video);
    emit(
      engine,
      Hls.Events.MANIFEST_LOADED,
      manifestLoaded({ 'com.apple.hls.chapters': CHAPTERS_ENTRY }, 'https://example.com/main.m3u8')
    );
    emit(engine, Hls.Events.MEDIA_DETACHED);

    expect(loader.reset).toHaveBeenCalledOnce();

    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(loader.load).toHaveBeenCalledTimes(2);
  });

  it('forgets the chapters when a new source starts loading, and on destroy', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);

    host.attach(document.createElement('video'));
    emit(
      engine,
      Hls.Events.MANIFEST_LOADED,
      manifestLoaded({ 'com.apple.hls.chapters': CHAPTERS_ENTRY }, 'https://example.com/main.m3u8')
    );
    emit(engine, Hls.Events.MANIFEST_LOADING);

    expect(loader.reset).toHaveBeenCalledOnce();

    // Nothing left to project once media reattaches.
    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(loader.load).toHaveBeenCalledOnce();

    emit(engine, Hls.Events.DESTROYING);

    expect(loader.reset).toHaveBeenCalledTimes(2);
  });
});
