import { findSessionDataUri, HlsChaptersLoader } from '@videojs/native-hls-video';
import { APPLE_HLS_CHAPTERS_DATA_ID } from '@videojs/spf/hls';
import { isString } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';
import type {
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  ManifestLoadedData,
  PlaylistLoaderConstructor,
  PlaylistLoaderContext,
} from 'hls.js';
import Hls from 'hls.js';

import type { HlsEngineHost } from './types';

interface ChaptersReference {
  uri: string;
  baseUrl: string;
}

/**
 * Wrap a playlist loader so the multivariant playlist's text reaches `onManifest` before hls.js parses it. Every other
 * playlist request goes through untouched.
 */
function withManifestText(
  BaseLoader: PlaylistLoaderConstructor,
  onManifest: (text: string) => void
): PlaylistLoaderConstructor {
  return class extends (BaseLoader as new (config: HlsConfig) => Loader<PlaylistLoaderContext>) {
    load(
      context: PlaylistLoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<PlaylistLoaderContext>
    ): void {
      // `PlaylistContextType` is a const enum hls.js does not ship at runtime.
      if ((context.type as string) !== 'manifest') return super.load(context, config, callbacks);

      super.load(context, config, {
        ...callbacks,
        onSuccess(response, stats, loaderContext, networkDetails) {
          if (isString(response.data)) onManifest(response.data);

          callbacks.onSuccess(response, stats, loaderContext, networkDetails);
        },
      });
    }
  };
}

/**
 * Chapters for hls.js playback: the Apple JSON chapters document the multivariant playlist references
 * (`#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters"`), projected as hidden `<track kind="chapters">` elements by
 * the same loader native playback uses.
 *
 * Hls.js keeps one session-data entry per `DATA-ID` — the last — so the playlist text is read here instead, through a
 * wrapped playlist loader, and the first chapters entry carrying a `URI` wins, as it does for native playback and SPF.
 *
 * Read on `MANIFEST_LOADED`, whose `url` is the response URL, so a relative `URI` resolves past redirects. The tracks
 * go with the source (`MANIFEST_LOADING`) and the element (`MEDIA_DETACHED`, `DESTROYING`); a manifest that loaded
 * before media was attached projects once it is.
 */
export function HlsJsChaptersMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsChapters extends (BaseClass as Constructor<HlsEngineHost>) {
    #chapters = new HlsChaptersLoader();
    #manifestText: string | null = null;
    #reference: ChaptersReference | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { engine } = this;
      if (!engine) return;

      const { config } = engine;

      config.pLoader = withManifestText(config.pLoader ?? (config.loader as PlaylistLoaderConstructor), (text) => {
        this.#manifestText = text;
      });

      engine.on(Hls.Events.MANIFEST_LOADING, () => this.#reset());
      engine.on(Hls.Events.MANIFEST_LOADED, (_event: string, data: ManifestLoadedData) => {
        const uri = isString(this.#manifestText)
          ? findSessionDataUri(this.#manifestText, APPLE_HLS_CHAPTERS_DATA_ID)
          : data.sessionData?.[APPLE_HLS_CHAPTERS_DATA_ID]?.URI;

        this.#reference = isString(uri) && uri ? { uri, baseUrl: data.url } : null;
        this.#load();
      });
      engine.on(Hls.Events.MEDIA_ATTACHED, () => this.#load());
      engine.on(Hls.Events.MEDIA_DETACHED, () => this.#chapters.reset());
      engine.on(Hls.Events.DESTROYING, () => this.#reset());
    }

    #load(): void {
      // The hls.js delegate always binds to the real `<video>` element.
      const target = this.target as HTMLVideoElement | null;
      if (!target || !this.#reference) return;

      this.#chapters.load(target, this.#reference.uri, this.#reference.baseUrl);
    }

    #reset(): void {
      this.#manifestText = null;
      this.#reference = null;
      this.#chapters.reset();
    }
  }

  return HlsJsChapters as unknown as Base;
}
