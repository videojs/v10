import {
  type AddChaptersTracksOptions,
  addChaptersTracksToMedia,
  removeAllChaptersTracksFromMedia,
} from '@videojs/spf/dom';
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
 * Load the Apple JSON chapters document at `url` onto `mediaElement`: one hidden `<track kind="chapters">` per title
 * language, built by SPF's `addChaptersTracksToMedia` so every HLS path — SPF, hls.js, and the browser's own — produces
 * the same tracks, with `options.preferredLanguage` leading. The open last chapter ends at `Number.MAX_SAFE_INTEGER`;
 * readers clamp it to the media duration.
 *
 * Aborting `signal` cancels a request in flight and removes the tracks loaded so far. Callers own deduplication — load
 * again only for a different document or element.
 *
 * Shared by the hls.js adapter, not part of this package's public API.
 *
 * @internal
 */
export function loadChaptersTracks(
  mediaElement: HTMLMediaElement,
  url: string,
  signal: AbortSignal,
  options: AddChaptersTracksOptions = {}
): void {
  if (signal.aborted) return;

  signal.addEventListener('abort', () => removeAllChaptersTracksFromMedia(mediaElement), { once: true });

  void loadHlsJsonChapters(url, signal).then((chapters) => {
    // A document that settled before the abort still must not load onto an
    // element that has since been cleaned up.
    if (signal.aborted) return;

    if (chapters.length > 0) addChaptersTracksToMedia(mediaElement, chapters, options);
  });
}

/**
 * Chapters for native HLS playback. The browser never exposes the multivariant playlist's session data, so the playlist
 * is fetched here — once per source, on `loadstart` — and the chapters document it references is loaded with
 * {@link loadChaptersTracks}. One request signal spans both fetches, so the tracks leave with the source (`emptied`) and
 * with the element (`detach`, `destroy`).
 */
export function NativeHlsChaptersMixin<Base extends Constructor<NativeHlsHost>>(BaseClass: Base) {
  class NativeHlsChapters extends (BaseClass as Constructor<NativeHlsHost>) {
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

        if (uri) loadChaptersTracks(target, new URL(uri, playlist.url).href, request.signal);
      } catch {
        // Network / CORS errors and an unresolvable URI leave the source without chapters.
      }
    }
  }

  return NativeHlsChapters as unknown as Base;
}
