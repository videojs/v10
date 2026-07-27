import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { StreamTypes } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData, MuxMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const MuxVideoBase = MediaAttachMixin(CustomMediaElement('video', MuxMedia));

export class MuxVideo extends MuxVideoBase {
  static properties = {
    ...MuxVideoBase.properties,
    thumbnail: { type: String, empty: '' },
    storyboard: { type: String, empty: '' },
  };

  constructor() {
    super();
    addComponent(this.host, new MuxData({ playerSoftwareName: 'mux-video' }));
    addComponent(this.host, new GoogleCast());
    // Storyboards aren't generated for live streams; re-evaluate when the type is detected.
    this.host.addEventListener('streamtypechange', () => this.#syncStoryboard());
    // Covers both the `src` attribute and the `source` property (JS-only).
    this.host.addEventListener('sourcechange', () => {
      this.#reflectSrc();
      this.#syncStoryboard();
    });
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'storyboard') this.#syncStoryboard();
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

  // Keeps a storyboard track child in sync, from the `storyboard` attribute or derived from `source`.
  #syncStoryboard() {
    // Live streams have no storyboard; skip until the type is known to be otherwise.
    const src = this.host.streamType === StreamTypes.LIVE ? undefined : this.host.storyboard || undefined;

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
