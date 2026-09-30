import { addChaptersTracksToMedia, removeAllChaptersTracksFromMedia } from '@videojs/spf/dom';
import { APPLE_HLS_CHAPTERS_DATA_ID, type Chapter, type HlsJsonChapters, parseHlsJsonChapters } from '@videojs/spf/hls';
import { isAbortError } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';

import type { NativeHlsHost } from './errors';
import { fetchPlaylist, findSessionDataUri, isMultivariantPlaylist, looksLikeM3u8 } from './m3u8-utils';

/**
 * Fetch and parse the Apple JSON chapters document at `url`. Chapters are optional and playback never depends on them,
 * so a document that won't load or won't parse yields none, announced only in development.
 */
async function loadHlsJsonChapters(url: string, signal: AbortSignal): Promise<Chapter[]> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    // The tag's contract is an Apple JSON chapters document; the parser is
    // written for that shape, and anything else lands in the catch below.
    const document: HlsJsonChapters = await response.json();

    return parseHlsJsonChapters(document, response.url || url);
  } catch (error) {
    if (__DEV__ && !signal.aborted && !isAbortError(error)) {
      console.warn(`[vjs-media] Failed to load the HLS chapters document at ${url}.`, error);
    }

    return [];
  }
}

/**
 * Projects the Apple JSON chapters an HLS source references (`#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters"`)
 * onto a media element: one hidden `<track kind="chapters">` per title language, built by SPF's
 * `addChaptersTracksToMedia` so every HLS path — SPF, hls.js, and the browser's own — produces the same tracks. The
 * open last chapter ends at `Number.MAX_SAFE_INTEGER`; readers clamp it to the media duration.
 *
 * One loader serves one playback engine. Loading a different document replaces the tracks from the last one; loading
 * the same document onto the same element again is a no-op, so a manifest that is announced twice costs one request.
 *
 * Shared by the hls.js adapter, not part of this package's public API.
 *
 * @internal
 */
export class HlsChaptersLoader {
  #media: HTMLMediaElement | null = null;
  #url: string | undefined;
  #request: AbortController | null = null;

  /**
   * Load the chapters document `uri` names, resolved against `baseUrl` — the URL the multivariant playlist was served
   * from, after redirects.
   */
  load(media: HTMLMediaElement, uri: string, baseUrl: string): void {
    const url = resolveUrl(uri, baseUrl);
    if (!url || (media === this.#media && url === this.#url)) return;

    this.reset();
    this.#media = media;
    this.#url = url;

    const request = (this.#request = new AbortController());

    void loadHlsJsonChapters(url, request.signal).then((chapters) => {
      // A document that settled before the abort still must not project onto
      // an element the loader has since moved away from.
      if (request.signal.aborted) return;

      this.#request = null;

      if (chapters.length > 0) addChaptersTracksToMedia(media, chapters);
    });
  }

  /** Abort a request in flight and remove the tracks projected so far. */
  reset(): void {
    this.#request?.abort();
    this.#request = null;

    if (this.#media) removeAllChaptersTracksFromMedia(this.#media);

    this.#media = null;
    this.#url = undefined;
  }
}

function resolveUrl(uri: string, baseUrl: string): string | undefined {
  try {
    return new URL(uri, baseUrl).href;
  } catch {
    return undefined;
  }
}

/**
 * Chapters for native HLS playback. The browser never exposes the multivariant playlist's session data, so the playlist
 * is fetched here — once per source, on `loadstart` — and the chapters document it references is handed to an
 * {@link HlsChaptersLoader}. The tracks leave with the source (`emptied`) and with the element (`detach`, `destroy`).
 */
export function NativeHlsChaptersMixin<Base extends Constructor<NativeHlsHost>>(BaseClass: Base) {
  class NativeHlsChapters extends (BaseClass as Constructor<NativeHlsHost>) {
    #chapters = new HlsChaptersLoader();
    #disconnect: AbortController | null = null;
    #request: AbortController | null = null;
    #currentSrc = '';

    attach(target: HTMLVideoElement) {
      super.attach(target);
      this.#init(target);
    }

    detach() {
      this.#destroy();
      super.detach?.();
    }

    destroy() {
      this.#destroy();
      super.destroy?.();
    }

    #destroy() {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#reset();
    }

    #reset() {
      this.#request?.abort();
      this.#request = null;
      this.#currentSrc = '';
      this.#chapters.reset();
    }

    #init(target: HTMLMediaElement) {
      this.#destroy();
      this.#disconnect = new AbortController();

      const { signal } = this.#disconnect;

      target.addEventListener('loadstart', () => this.#refresh(target), { signal });
      target.addEventListener('emptied', () => this.#reset(), { signal });

      if (target.currentSrc || target.src) this.#refresh(target);
    }

    async #refresh(target: HTMLMediaElement) {
      const src = target.currentSrc || target.src;
      if (!src || !looksLikeM3u8(src) || src === this.#currentSrc) return;

      this.#reset();
      this.#currentSrc = src;

      const request = (this.#request = new AbortController());

      try {
        const playlist = await fetchPlaylist(src, { signal: request.signal });
        if (request.signal.aborted || !isMultivariantPlaylist(playlist.text)) return;

        const uri = findSessionDataUri(playlist.text, APPLE_HLS_CHAPTERS_DATA_ID);

        if (uri) this.#chapters.load(target, uri, playlist.url);
      } catch {
        // Network / CORS errors leave the source without chapters.
      } finally {
        if (this.#request === request) this.#request = null;
      }
    }
  }

  return NativeHlsChapters as unknown as Base;
}
