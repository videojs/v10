import { HTMLVideoAdapter } from '@videojs/media/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { HlsChaptersLoader, NativeHlsChaptersMixin } from '../chapters';

// Jsdom has no text track implementation; the projection itself is SPF's and
// covered in a real browser there. Here it is observed at the boundary.
const { addChaptersTracksToMedia, removeAllChaptersTracksFromMedia } = vi.hoisted(() => ({
  addChaptersTracksToMedia: vi.fn(),
  removeAllChaptersTracksFromMedia: vi.fn(),
}));

vi.mock('@videojs/spf/dom', () => ({ addChaptersTracksToMedia, removeAllChaptersTracksFromMedia }));

const DOCUMENT = [
  { 'start-time': 0, titles: [{ language: 'und', title: 'Intro' }] },
  { 'start-time': 10, titles: [{ language: 'und', title: 'Outro' }] },
];

const CHAPTERS = [
  { startTime: 0, endTime: 10, titles: { und: 'Intro' } },
  { startTime: 10, titles: { und: 'Outro' } },
];

type Responder = (url: string) => Response | Promise<Response>;

function stubFetch(responses: Record<string, Responder | string | object>) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    const entry = responses[url];

    init?.signal?.throwIfAborted();

    if (entry === undefined) return new Response('not found', { status: 404 });

    if (typeof entry === 'function') return (entry as Responder)(url);

    return new Response(typeof entry === 'string' ? entry : JSON.stringify(entry), { status: 200 });
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

function requestedUrls(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls.map(([input]) => input.toString());
}

const settle = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

beforeEach(() => {
  addChaptersTracksToMedia.mockClear();
  removeAllChaptersTracksFromMedia.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HlsChaptersLoader', () => {
  it('fetches the document resolved against the playlist URL and projects its chapters', async () => {
    const fetchMock = stubFetch({ 'https://cdn.example.com/a/chapters.json': DOCUMENT });
    const media = document.createElement('video');
    const loader = new HlsChaptersLoader();

    loader.load(media, 'chapters.json', 'https://cdn.example.com/a/main.m3u8');

    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledOnce());
    expect(requestedUrls(fetchMock)).toEqual(['https://cdn.example.com/a/chapters.json']);
    expect(addChaptersTracksToMedia).toHaveBeenCalledWith(media, CHAPTERS);
  });

  it('loads the same document onto the same element once', async () => {
    const fetchMock = stubFetch({ 'https://example.com/chapters.json': DOCUMENT });
    const media = document.createElement('video');
    const loader = new HlsChaptersLoader();

    loader.load(media, 'https://example.com/chapters.json', 'https://example.com/main.m3u8');
    loader.load(media, 'chapters.json', 'https://example.com/other.m3u8');

    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('replaces the tracks of a previous document', async () => {
    stubFetch({ 'https://example.com/a.json': DOCUMENT, 'https://example.com/b.json': DOCUMENT });
    const media = document.createElement('video');
    const loader = new HlsChaptersLoader();

    loader.load(media, 'a.json', 'https://example.com/main.m3u8');
    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledOnce());

    loader.load(media, 'b.json', 'https://example.com/main.m3u8');

    expect(removeAllChaptersTracksFromMedia).toHaveBeenCalledWith(media);
    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledTimes(2));
  });

  it('aborts a request in flight on reset and projects nothing', async () => {
    let signal: AbortSignal | undefined;
    let release!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        await released;

        return new Response(JSON.stringify(DOCUMENT));
      })
    );

    const media = document.createElement('video');
    const loader = new HlsChaptersLoader();

    loader.load(media, 'https://example.com/chapters.json', 'https://example.com/main.m3u8');
    await vi.waitFor(() => expect(signal).toBeDefined());

    loader.reset();

    expect(signal!.aborted).toBe(true);
    expect(removeAllChaptersTracksFromMedia).toHaveBeenCalledWith(media);

    release();
    await settle();

    expect(addChaptersTracksToMedia).not.toHaveBeenCalled();
  });

  it('projects nothing and warns when the document fails to load or parse', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    stubFetch({
      'https://example.com/missing.json': () => new Response('', { status: 500 }),
      'https://example.com/garbage.json': 'not json',
      'https://example.com/object.json': { not: 'a chapters document' },
    });

    const media = document.createElement('video');

    for (const name of ['missing', 'garbage', 'object']) {
      new HlsChaptersLoader().load(media, `${name}.json`, 'https://example.com/main.m3u8');
    }

    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(3));
    expect(addChaptersTracksToMedia).not.toHaveBeenCalled();
  });
});

class FakeHost extends HTMLVideoAdapter {}

const NativeHlsChapters = NativeHlsChaptersMixin(FakeHost);

const MULTIVARIANT = [
  '#EXTM3U',
  '#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters",URI="chapters.json"',
  '#EXT-X-STREAM-INF:BANDWIDTH=2000000',
  'media.m3u8',
].join('\n');

function createVideoWithSrc(src: string): HTMLVideoElement {
  const video = document.createElement('video');

  // Jsdom doesn't load the source; only `currentSrc` is read.
  Object.defineProperty(video, 'currentSrc', { configurable: true, writable: true, value: src });

  return video;
}

describe('NativeHlsChaptersMixin', () => {
  it('projects the chapters the multivariant playlist references', async () => {
    const fetchMock = stubFetch({
      'https://stream.example.com/main.m3u8': MULTIVARIANT,
      'https://stream.example.com/chapters.json': DOCUMENT,
    });
    const video = createVideoWithSrc('https://stream.example.com/main.m3u8');
    const host = new NativeHlsChapters();

    host.attach(video);

    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledWith(video, CHAPTERS));
    expect(requestedUrls(fetchMock)).toEqual([
      'https://stream.example.com/main.m3u8',
      'https://stream.example.com/chapters.json',
    ]);

    host.destroy();
  });

  it('resolves the chapters URI against the playlist response URL after a redirect', async () => {
    const fetchMock = stubFetch({
      'https://stream.example.com/main.m3u8': () => {
        const response = new Response(MULTIVARIANT);

        Object.defineProperty(response, 'url', { value: 'https://cdn.example.com/redirected/main.m3u8' });

        return response;
      },
      'https://cdn.example.com/redirected/chapters.json': DOCUMENT,
    });
    const host = new NativeHlsChapters();

    host.attach(createVideoWithSrc('https://stream.example.com/main.m3u8'));

    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledOnce());
    expect(requestedUrls(fetchMock)[1]).toBe('https://cdn.example.com/redirected/chapters.json');

    host.destroy();
  });

  it('fetches the playlist once per source across repeated loadstarts', async () => {
    const fetchMock = stubFetch({
      'https://stream.example.com/main.m3u8': MULTIVARIANT,
      'https://stream.example.com/chapters.json': DOCUMENT,
    });
    const video = createVideoWithSrc('https://stream.example.com/main.m3u8');
    const host = new NativeHlsChapters();

    host.attach(video);
    video.dispatchEvent(new Event('loadstart'));

    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);

    host.destroy();
  });

  it('does nothing for a playlist without chapters session data', async () => {
    const fetchMock = stubFetch({
      'https://stream.example.com/main.m3u8': ['#EXTM3U', '#EXT-X-STREAM-INF:BANDWIDTH=1', 'media.m3u8'].join('\n'),
    });
    const host = new NativeHlsChapters();

    host.attach(createVideoWithSrc('https://stream.example.com/main.m3u8'));
    await settle();
    await settle();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(addChaptersTracksToMedia).not.toHaveBeenCalled();

    host.destroy();
  });

  it('ignores sources that are not HLS', async () => {
    const fetchMock = stubFetch({});
    const host = new NativeHlsChapters();

    host.attach(createVideoWithSrc('https://example.com/video.mp4'));
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();

    host.destroy();
  });

  it('removes the tracks when the source empties, and loads the next source', async () => {
    stubFetch({
      'https://stream.example.com/a.m3u8': MULTIVARIANT,
      'https://stream.example.com/b.m3u8': MULTIVARIANT.replace('chapters.json', 'b.json'),
      'https://stream.example.com/chapters.json': DOCUMENT,
      'https://stream.example.com/b.json': DOCUMENT,
    });
    const video = createVideoWithSrc('https://stream.example.com/a.m3u8');
    const host = new NativeHlsChapters();

    host.attach(video);
    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledOnce());

    video.dispatchEvent(new Event('emptied'));

    expect(removeAllChaptersTracksFromMedia).toHaveBeenCalledWith(video);

    Object.defineProperty(video, 'currentSrc', { value: 'https://stream.example.com/b.m3u8' });
    video.dispatchEvent(new Event('loadstart'));

    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledTimes(2));

    host.destroy();
  });

  it('removes the tracks on detach', async () => {
    stubFetch({
      'https://stream.example.com/main.m3u8': MULTIVARIANT,
      'https://stream.example.com/chapters.json': DOCUMENT,
    });
    const video = createVideoWithSrc('https://stream.example.com/main.m3u8');
    const host = new NativeHlsChapters();

    host.attach(video);
    await vi.waitFor(() => expect(addChaptersTracksToMedia).toHaveBeenCalledOnce());

    host.detach();

    expect(removeAllChaptersTracksFromMedia).toHaveBeenCalledWith(video);
  });
});
