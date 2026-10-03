import { HTMLVideoAdapter } from '@videojs/media/dom';
import type { LoaderCallbacks, PlaylistLoaderConstructor, PlaylistLoaderContext } from 'hls.js';
import Hls from 'hls.js';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { HlsJsChaptersMixin } from '../chapters';

// The load (fetch, parse, add tracks) is shared with native playback and
// covered there; here only what the mixin hands it, and when it aborts, is observed.
const loadChaptersTracks = vi.hoisted(() =>
  vi.fn((..._args: Parameters<typeof import('@videojs/native-hls-video').loadChaptersTracks>) => {})
);

vi.mock('@videojs/native-hls-video', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@videojs/native-hls-video')>()),
  loadChaptersTracks,
}));

/** The signal of the most recent load. */
function lastSignal(): AbortSignal {
  return loadChaptersTracks.mock.lastCall![2];
}

type Callbacks = LoaderCallbacks<PlaylistLoaderContext>;

/** Stands in for hls.js's XHR loader: answers every request with whatever `respond` returns. */
function createBaseLoader(respond: (context: PlaylistLoaderContext) => string) {
  return class {
    context: PlaylistLoaderContext | null = null;
    stats = {};

    load(context: PlaylistLoaderContext, _config: unknown, callbacks: Callbacks) {
      callbacks.onSuccess({ url: context.url, data: respond(context) }, this.stats as never, context, null);
    }

    abort() {}
    destroy() {}
  };
}

/** What the fake network serves, by URL. */
const playlists = new Map<string, string>();

function createEngine(pLoader?: PlaylistLoaderConstructor): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  return {
    config: { loader: createBaseLoader((context) => playlists.get(context.url) ?? ''), pLoader },
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

/** Request `url` through the engine's playlist loader, as hls.js does. */
function requestPlaylist(engine: Hls, type: string, url: string, callbacks: Partial<Callbacks> = {}) {
  const PlaylistLoader = engine.config.pLoader!;
  const context = { type, url, responseType: 'text' } as unknown as PlaylistLoaderContext;

  new PlaylistLoader(engine.config).load(context, {} as never, {
    onSuccess: vi.fn(),
    onError: vi.fn(),
    onTimeout: vi.fn(),
    ...callbacks,
  });
}

/**
 * Load a multivariant playlist the way hls.js does: `MANIFEST_LOADING`, the request, then `MANIFEST_LOADED` carrying
 * the session data hls.js parsed — one entry per `DATA-ID`, the last one written.
 */
function loadManifest(
  engine: Hls,
  playlist: string,
  url: string,
  sessionData?: Record<string, Record<string, string>>
) {
  playlists.set(url, playlist);
  emit(engine, Hls.Events.MANIFEST_LOADING);
  requestPlaylist(engine, 'manifest', url);
  emit(engine, Hls.Events.MANIFEST_LOADED, { sessionData: sessionData ?? null, url });
}

const CHAPTERS_TAG = '#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters",URI="chapters.json"';

function multivariant(...tags: string[]) {
  return ['#EXTM3U', ...tags, '#EXT-X-STREAM-INF:BANDWIDTH=1', 'media.m3u8'].join('\n');
}

beforeEach(() => {
  playlists.clear();
  loadChaptersTracks.mockClear();
});

describe('HlsJsChaptersMixin', () => {
  it('loads the chapters document the manifest references, against the manifest response URL', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    host.attach(video);
    loadManifest(engine, multivariant(CHAPTERS_TAG), 'https://cdn.example.com/redirected/main.m3u8');

    expect(loadChaptersTracks).toHaveBeenCalledWith(
      video,
      'https://cdn.example.com/redirected/chapters.json',
      expect.any(AbortSignal),
      { preferredLanguage: undefined }
    );
  });

  it('reads the first chapters entry with a URI, where hls.js keeps the last', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    host.attach(video);
    loadManifest(
      engine,
      multivariant(
        '#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters",URI="first.json",LANGUAGE="en"',
        '#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters",VALUE="inline",LANGUAGE="fr"'
      ),
      'https://example.com/main.m3u8',
      { 'com.apple.hls.chapters': { 'DATA-ID': 'com.apple.hls.chapters', VALUE: 'inline', LANGUAGE: 'fr' } }
    );

    expect(loadChaptersTracks).toHaveBeenCalledWith(video, 'https://example.com/first.json', expect.any(AbortSignal), {
      preferredLanguage: undefined,
    });
  });

  it("falls back to hls.js's session data when the playlist text never arrived", () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    host.attach(video);
    emit(engine, Hls.Events.MANIFEST_LOADING);
    emit(engine, Hls.Events.MANIFEST_LOADED, {
      sessionData: { 'com.apple.hls.chapters': { 'DATA-ID': 'com.apple.hls.chapters', URI: 'chapters.json' } },
      url: 'https://example.com/main.m3u8',
    });

    expect(loadChaptersTracks).toHaveBeenCalledWith(
      video,
      'https://example.com/chapters.json',
      expect.any(AbortSignal),
      { preferredLanguage: undefined }
    );
  });

  it('passes every other playlist request through untouched', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const onSuccess = vi.fn();

    host.attach(document.createElement('video'));
    playlists.set('https://example.com/media.m3u8', multivariant(CHAPTERS_TAG));
    emit(engine, Hls.Events.MANIFEST_LOADING);
    requestPlaylist(engine, 'level', 'https://example.com/media.m3u8', { onSuccess });
    emit(engine, Hls.Events.MANIFEST_LOADED, { sessionData: null, url: 'https://example.com/main.m3u8' });

    expect(onSuccess).toHaveBeenCalledOnce();
    expect(loadChaptersTracks).not.toHaveBeenCalled();
  });

  it('wraps a configured playlist loader rather than replacing it', () => {
    const load = vi.fn();
    const Custom = class extends createBaseLoader(() => multivariant(CHAPTERS_TAG)) {
      override load(context: PlaylistLoaderContext, config: unknown, callbacks: Callbacks) {
        load(context.url);
        super.load(context, config, callbacks);
      }
    };
    const engine = createEngine(Custom as unknown as PlaylistLoaderConstructor);
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');
    const onSuccess = vi.fn();

    host.attach(video);
    emit(engine, Hls.Events.MANIFEST_LOADING);
    requestPlaylist(engine, 'manifest', 'https://example.com/main.m3u8', { onSuccess });
    emit(engine, Hls.Events.MANIFEST_LOADED, { sessionData: null, url: 'https://example.com/main.m3u8' });

    expect(load).toHaveBeenCalledWith('https://example.com/main.m3u8');
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(loadChaptersTracks).toHaveBeenCalledWith(
      video,
      'https://example.com/chapters.json',
      expect.any(AbortSignal),
      { preferredLanguage: undefined }
    );
  });

  it('does nothing for a manifest without a chapters URI', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);

    host.attach(document.createElement('video'));
    loadManifest(engine, multivariant(), 'https://example.com/main.m3u8');
    loadManifest(
      engine,
      multivariant('#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters",VALUE="[]"'),
      'https://example.com/main.m3u8'
    );

    expect(loadChaptersTracks).not.toHaveBeenCalled();
  });

  it('waits for media before loading a manifest that arrived first', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    loadManifest(engine, multivariant(CHAPTERS_TAG), 'https://example.com/main.m3u8');

    expect(loadChaptersTracks).not.toHaveBeenCalled();

    host.attach(video);
    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(loadChaptersTracks).toHaveBeenCalledWith(
      video,
      'https://example.com/chapters.json',
      expect.any(AbortSignal),
      { preferredLanguage: undefined }
    );
  });

  it('projects once while media stays attached', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);

    host.attach(document.createElement('video'));
    loadManifest(engine, multivariant(CHAPTERS_TAG), 'https://example.com/main.m3u8');
    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(loadChaptersTracks).toHaveBeenCalledOnce();
  });

  it('removes the tracks on detach and projects them again on reattach', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);

    host.attach(document.createElement('video'));
    loadManifest(engine, multivariant(CHAPTERS_TAG), 'https://example.com/main.m3u8');
    const signal = lastSignal();

    emit(engine, Hls.Events.MEDIA_DETACHED);

    expect(signal.aborted).toBe(true);

    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(loadChaptersTracks).toHaveBeenCalledTimes(2);
  });

  it('forgets the chapters when a new source starts loading', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);

    host.attach(document.createElement('video'));
    loadManifest(engine, multivariant(CHAPTERS_TAG), 'https://example.com/main.m3u8');
    const signal = lastSignal();

    emit(engine, Hls.Events.MANIFEST_LOADING);

    expect(signal.aborted).toBe(true);

    // Nothing left to project once media reattaches.
    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(loadChaptersTracks).toHaveBeenCalledOnce();
  });

  it('removes the tracks on destroy', () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);

    host.attach(document.createElement('video'));
    loadManifest(engine, multivariant(CHAPTERS_TAG), 'https://example.com/main.m3u8');
    emit(engine, Hls.Events.DESTROYING);

    expect(lastSignal().aborted).toBe(true);
  });

  it("leads with hls.js's subtitle preference", () => {
    const engine = createEngine();
    const host = new HlsJsChapters(engine);
    const video = document.createElement('video');

    engine.config.subtitlePreference = { lang: 'es' };
    host.attach(video);
    loadManifest(engine, multivariant(CHAPTERS_TAG), 'https://example.com/main.m3u8');

    expect(loadChaptersTracks).toHaveBeenCalledWith(
      video,
      'https://example.com/chapters.json',
      expect.any(AbortSignal),
      {
        preferredLanguage: 'es',
      }
    );
  });
});
