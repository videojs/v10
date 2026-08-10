import { afterEach, describe, expect, it } from 'vitest';
import { NativeHlsMedia, type NativeHlsSource } from '../index';

const MANIFEST = 'https://example.test/video.m3u8';
const DRM: NativeHlsSource['engine'] = {
  nativeHls: { drmSystems: { 'com.apple.fps': { licenseUrl: 'https://license.test/fairplay' } } },
};

/**
 * jsdom implements neither the media load algorithm nor its events, so what
 * reaches the element is observed through the assignments themselves.
 */
function setup() {
  const video = document.createElement('video');
  document.body.append(video);

  const loads: string[] = [];
  let src = '';
  Object.defineProperty(video, 'src', {
    configurable: true,
    get: () => src,
    set: (value: string) => {
      src = value;
      loads.push(value);
    },
  });

  const media = new NativeHlsMedia();
  media.attach(video);

  return { media, video, loads };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('NativeHlsMedia', () => {
  describe('source', () => {
    it('derives src and loads the manifest', () => {
      const { media, loads } = setup();

      media.source = { src: MANIFEST, engine: DRM };

      expect(media.src).toBe(MANIFEST);
      expect(loads).toEqual([MANIFEST]);
    });

    it('leaves the element alone for a source naming the same URL', () => {
      const { media, loads } = setup();

      media.source = { src: MANIFEST, engine: DRM };
      // Same values in a new object (e.g. an inline React prop). Reloading here
      // would restart playback, mid key exchange included.
      media.source = { src: MANIFEST, engine: DRM };

      expect(loads).toEqual([MANIFEST]);
      expect(media.source).toEqual({ src: MANIFEST, engine: DRM });
    });

    it('loads a new URL and carries the engine options over', () => {
      const { media, loads } = setup();

      media.source = { src: MANIFEST, engine: DRM };
      media.src = 'https://example.test/other.m3u8';

      expect(loads).toEqual([MANIFEST, 'https://example.test/other.m3u8']);
      expect(media.source).toEqual({ src: 'https://example.test/other.m3u8', engine: DRM });
    });

    it('reloads when `src` is assigned the URL already playing', () => {
      const { media, loads } = setup();

      media.source = { src: MANIFEST };
      // `src` mirrors the element, where assigning it always loads — it is how
      // `HlsJsMedia` loads a native delegate, and how a failed source is retried.
      media.src = MANIFEST;

      expect(loads).toEqual([MANIFEST, MANIFEST]);
    });
  });
});
