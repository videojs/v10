import {
  createMuxDrmSystems,
  createMuxPosterURL,
  createMuxStoryboardURL,
  createMuxVideoURL,
  type MuxContentData,
  type MuxSourceBase,
  parseMuxVideoURL,
} from '@videojs/media/dom/mux/source';
import { shallowEqual } from '@videojs/utils/object';
import type { Constructor } from '@videojs/utils/types';

export interface MuxMediaProps {
  src: string;
  source: MuxSourceBase | null;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  src: '',
  source: null,
};

export interface MuxMediaAPI extends MuxMediaProps {
  readonly contentData: MuxContentData;
}

/**
 * Mux identity over any SPF Media: the structured `source`, the `src` derived from it, and the image URLs it describes.
 *
 * Everything here is Mux identity, so it carries no engine and both flavors get it unchanged — the video Media over the
 * full HLS engine, the audio-only Media over the subtractive one. A mixin rather than a shared base class because each
 * flavor extends a different SPF Media, so there is no common class to put this on, only a common `src` accessor to
 * write through.
 *
 * Unlike the hls.js-backed `MuxMedia`, there is no inherited `source` to delegate to — the SPF Medias know only `src` —
 * so this owns the structured source and dispatches `sourcechange` itself.
 *
 * @fires sourcechange - Fired when `source` changes, either directly or by parsing a new `src`. Read `source` for the
 *   new value.
 * @fires contentdatachange - Fired when the derived `contentData` changes. Read `contentData` for the new value.
 */
export function MuxMediaMixin<Base extends Constructor<any>>(BaseClass: Base) {
  class MuxMediaImpl extends BaseClass {
    /**
     * Named on the error copy when this engine can't play a source: the hls.js-backed Mux Media plays the MPEG-TS
     * sources that SPF does not, and it backs both `<mux-video>` and `<mux-audio>`.
     *
     * Names the flavor rather than an import path, because one Media is reached through three of them —
     * `@videojs/html`, `@videojs/react`, and this package — and each has a different counterpart. The flavor suffix is
     * the one thing common to the layers a consumer imports elements and components from.
     */
    static get alternativeMediaSuggestion(): string | undefined {
      return 'Try the hls.js-backed Mux media instead: import the `hls-js` flavor in place of the `spf` one.';
    }

    #source: MuxSourceBase | null = muxMediaDefaultProps.source;
    #contentData: MuxContentData = {};
    /**
     * Media source URL. Setting a Mux stream URL (`https://stream.mux.com/<playback-id>.m3u8?...`) extracts the
     * playback ID and query params into `source`; other URLs are kept as a plain `source.src`.
     *
     * Only playback options carry over. Mux identity comes from the URL, and the signed `poster`, `storyboard`, and
     * `drm` tokens are scoped to a playback ID, so carrying them onto a different source would build rejected URLs.
     */
    get src(): string {
      return super.src;
    }

    set src(value: string) {
      // A URL already describing the current source leaves it alone. The elements
      // reflect the derived `src` back to the host, and re-deriving would drop the
      // params a Mux URL does not carry, such as `poster`.
      if (super.src === value) return;

      this.source = parseMuxVideoURL(value) ?? (value ? { src: value } : null);
    }

    /**
     * Structured Mux source. Setting it derives `src` from the playback ID, custom domain, and `playback` params
     * (appended as `snake_case` query params). A `playback.token` replaces all other params — signed URLs bake them
     * into the token.
     */
    get source(): MuxSourceBase | null {
      return this.#source;
    }

    set source(value: MuxSourceBase | null) {
      const source = value ?? null;
      // Changing anything takes a new object, so handing the same one back costs
      // nothing.
      if (source === this.#source) return;

      this.#source = source;

      // Refresh the bag first: `sourcechange` comes from the base's own setter
      // below, and listeners read `contentData` from that event.
      const contentDataChanged = this.#refreshContentData();

      // Project Mux identity onto the generic source the base understands. A
      // `drm.token` derives Mux's three license servers here, and entries naming
      // servers outright override them — the base's resolvers read the result,
      // so there is one licensing path rather than a Mux-shaped copy of it.
      const { token: _token, ...named } = source?.drm ?? {};
      const drm = { ...createMuxDrmSystems(source), ...named };
      super.source = source
        ? {
            src: (createMuxVideoURL(source) ?? source.src) || '',
            ...(Object.keys(drm).length > 0 && { drm }),
          }
        : null;

      if (contentDataChanged) this.dispatchEvent?.(new Event('contentdatachange'));
    }

    /**
     * Image URLs `source` describes rather than plays: `poster` from its `poster` params, `storyboard` from its
     * `storyboard` params.
     *
     * Derived from `source` and nothing else. The same object is handed back until one of those URLs changes, and
     * `contentdatachange` announces it when it does. Nothing here is applied for you.
     */
    get contentData(): MuxContentData {
      return this.#contentData;
    }

    /** Rebuild the derived bag, reporting whether anything about it changed. */
    #refreshContentData(): boolean {
      const poster = createMuxPosterURL(this.#source);
      const storyboard = createMuxStoryboardURL(this.#source);

      const next: MuxContentData = {
        ...(poster && { poster }),
        ...(storyboard && { storyboard }),
      };
      if (shallowEqual(this.#contentData, next)) return false;

      this.#contentData = next;
      return true;
    }
  }

  // `source` is re-typed rather than intersected with the base's: this mixin
  // accepts the wider Mux shape, whose `drm` carries a `token` that the generic
  // key-system map — an index signature over `DrmSystemConfig` — has no place
  // for. Intersecting the two would make every Mux source unassignable.
  //
  // Statics are sourced from `Base`, so this mixin's own needs adding back to
  // the type or callers can't read it.
  return MuxMediaImpl as unknown as Constructor<Omit<InstanceType<Base>, 'source'> & MuxMediaAPI> &
    Omit<Base, 'prototype'> & {
      readonly alternativeMediaSuggestion: string | undefined;
    };
}
