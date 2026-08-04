import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { StreamTypes } from '@videojs/media/dom/hls-js';
import { MuxMedia } from '@videojs/media/dom/mux';
import { isUndefined } from '@videojs/utils/predicate';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const MuxVideoBase = MediaAttachMixin(CustomMediaElement('video', MuxMedia));

export class MuxVideo extends MuxVideoBase {
  // Declared here rather than in `static properties` because it does not map to a
  // host property of its own: it feeds `source.poster.time`. The generic path
  // would also coerce a removed attribute to `0`, which is a valid poster time.
  static get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'poster-time'];
  }

  constructor() {
    super();
    // Storyboards aren't generated for live streams; re-evaluate when the type is detected.
    this.host.addEventListener('streamtypechange', () => this.#syncStoryboard());
    // Covers both the `src` attribute and the `source` property (JS-only).
    this.host.addEventListener('sourcechange', () => {
      this.#reflectSrc();
      this.#syncPosterTime();
      this.#syncStoryboard();
    });
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'poster-time') {
      // Removing the attribute clears what it set. A value that is present but not
      // a number is ignored rather than treated as removal, so it cannot wipe a
      // `source.poster.time` set through JS.
      if (newValue === null) this.#applyPosterTime(undefined);
      else this.#syncPosterTime();
      return;
    }
    super.attributeChangedCallback(name, oldValue, newValue);
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
    const src = this.host.streamType === StreamTypes.LIVE ? undefined : this.host.contentData.storyboard;

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
