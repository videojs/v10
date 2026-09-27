import { HlsChaptersLoader } from '@videojs/native-hls-video';
import { APPLE_HLS_CHAPTERS_DATA_ID } from '@videojs/spf/hls';
import { isString } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';
import type { ManifestLoadedData } from 'hls.js';
import Hls from 'hls.js';

import type { HlsEngineHost } from './types';

interface ChaptersReference {
  uri: string;
  baseUrl: string;
}

/**
 * Chapters for hls.js playback: the Apple JSON chapters document the multivariant playlist references
 * (`#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters"`), projected as hidden `<track kind="chapters">` elements by
 * the same loader native playback uses.
 *
 * Read from `MANIFEST_LOADED`, whose `url` is the response URL, so a relative `URI` resolves past redirects. The tracks
 * go with the source (`MANIFEST_LOADING`) and the element (`MEDIA_DETACHED`, `DESTROYING`); a manifest that loaded
 * before media was attached projects once it is.
 */
export function HlsJsChaptersMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsChapters extends (BaseClass as Constructor<HlsEngineHost>) {
    #chapters = new HlsChaptersLoader();
    #reference: ChaptersReference | null = null;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#reset());
      this.engine?.on(Hls.Events.MANIFEST_LOADED, (_event: string, data: ManifestLoadedData) => {
        const uri = data.sessionData?.[APPLE_HLS_CHAPTERS_DATA_ID]?.URI;

        this.#reference = isString(uri) && uri ? { uri, baseUrl: data.url } : null;
        this.#load();
      });
      this.engine?.on(Hls.Events.MEDIA_ATTACHED, () => this.#load());
      this.engine?.on(Hls.Events.MEDIA_DETACHED, () => this.#chapters.reset());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#reset());
    }

    #load(): void {
      // The hls.js delegate always binds to the real `<video>` element.
      const target = this.target as HTMLVideoElement | null;
      if (!target || !this.#reference) return;

      this.#chapters.load(target, this.#reference.uri, this.#reference.baseUrl);
    }

    #reset(): void {
      this.#reference = null;
      this.#chapters.reset();
    }
  }

  return HlsJsChapters as unknown as Base;
}
