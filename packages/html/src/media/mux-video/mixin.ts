import { type MediaStreamType, MediaStreamTypes } from '@videojs/media';
import type { MuxContentData, MuxSourceBase } from '@videojs/media/dom/mux/source';
import { isUndefined } from '@videojs/utils/predicate';
import type { AnyConstructor, Constructor } from '@videojs/utils/types';

/**
 * What this mixin needs from whichever Mux Media the element hosts.
 *
 * Structural on purpose: the hls.js-backed `MuxMedia` and the SPF-backed one satisfy it identically, and everything
 * here is Mux identity or the WHATWG surface — nothing engine-specific — so the element itself has no engine.
 */
interface MuxVideoHost {
  src: string;
  source: MuxSourceBase | null;
  readonly contentData: MuxContentData;
  readonly streamType: MediaStreamType | undefined;
  addEventListener(type: string, listener: () => void): void;
}

interface MuxVideoElementLike extends HTMLElement {
  readonly host: MuxVideoHost;
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
}

/**
 * The Mux-specific element behavior, over any Mux Media: the `poster-time` attribute, `src` reflection, and the
 * storyboard `<track>` child.
 *
 * Mixin rather than a base class because each flavor's element is built on a different `CustomMediaElement`, so there
 * is no common class to extend — only a common host contract.
 */
export function MuxVideoMixin<Class extends AnyConstructor<HTMLElement>>(BaseClass: Class): Class {
  class MuxVideoElement extends (BaseClass as unknown as Constructor<MuxVideoElementLike>) {
    // Declared here rather than in `static properties` because it does not map to a
    // host property of its own: it feeds `source.poster.time`. The generic path
    // would also coerce a removed attribute to `0`, which is a valid poster time.
    static get observedAttributes(): string[] {
      const inherited = (BaseClass as unknown as { observedAttributes?: string[] }).observedAttributes ?? [];

      return [...inherited, 'poster-time'];
    }

    constructor(...args: any[]) {
      super(...args);
      // Storyboards aren't generated for live streams; re-evaluate when the type is detected.
      this.host.addEventListener('streamtypechange', () => this.#syncStoryboard());
      // Covers both the `src` attribute and the `source` property (JS-only).
      this.host.addEventListener('sourcechange', () => {
        this.#reflectSrc();
        this.#syncPosterTime();
        this.#syncStoryboard();
      });
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      if (name === 'poster-time') {
        // Removing the attribute clears what it set. A value that is present but not
        // a number is ignored rather than treated as removal, so it cannot wipe a
        // `source.poster.time` set through JS.
        if (newValue === null) this.#applyPosterTime(undefined);
        else this.#syncPosterTime();

        return;
      }

      super.attributeChangedCallback?.(name, oldValue, newValue);
    }

    #posterTimeAttr() {
      const attr = this.getAttribute('poster-time');
      const parsed = attr ? Number(attr) : Number.NaN;

      return Number.isNaN(parsed) ? undefined : parsed;
    }

    // Re-applies `poster-time` after a source change, because Mux identity comes
    // from the URL and carries no poster params over. An absent attribute means no
    // opinion here, so a `source.poster.time` set through JS is left alone — only
    // removing the attribute clears it.
    #syncPosterTime() {
      const time = this.#posterTimeAttr();

      if (!isUndefined(time)) this.#applyPosterTime(time);
    }

    // Mirrors the `poster-time` attribute into `source.poster.time`, which is what
    // the derived poster URL is built from.
    #applyPosterTime(time: number | undefined) {
      const source = this.host.source;
      if (source?.poster?.time === time) return;

      // Nothing to write into yet. `#syncPosterTime` re-applies the attribute once a
      // source arrives, so a poster-only source is never worth fabricating — it has
      // no URL to play, and assigning it would schedule a load anyway.
      if (!source) return;

      const poster = { ...source?.poster };

      if (isUndefined(time)) delete poster.time;
      else poster.time = time;

      this.host.source = { ...source, poster: Object.keys(poster).length > 0 ? poster : undefined };
    }

    // Mirrors the host `src` to the `src` attribute so it matches the active playback URL.
    #reflectSrc() {
      const src = this.host.src;

      if (src) {
        if (this.getAttribute('src') !== src) this.setAttribute('src', src);
      } else if (this.hasAttribute('src')) {
        this.removeAttribute('src');
      }
    }

    // Keeps a storyboard track child in sync with the URL derived from `source`.
    #syncStoryboard() {
      // Live streams have no storyboard; skip until the type is known to be otherwise.
      const src = this.host.streamType === MediaStreamTypes.LIVE ? undefined : this.host.contentData.storyboard;

      let track = this.querySelector<HTMLTrackElement>('track[data-storyboard]');

      if (!src) {
        track?.remove();
        return;
      }

      if (!track) {
        track = document.createElement('track');
        track.kind = 'metadata';
        track.label = 'thumbnails';
        track.default = true;
        track.setAttribute('data-storyboard', '');
      }

      if (track.getAttribute('src') !== src) track.setAttribute('src', src);

      if (track.parentNode !== this) this.append(track);
    }
  }

  return MuxVideoElement as unknown as Class;
}
