import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { StreamTypes } from '@videojs/core/dom/media/hls-js';
import { addComponent } from '@videojs/core/dom/media/media-host';
import { MuxData, MuxMedia } from '@videojs/core/dom/media/mux';
import type { Constructor } from '@videojs/utils/types';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

// Lifecycle members that exist on the custom media element at runtime but aren't
// part of the `CustomMediaElement` return type.
interface MuxVideoLifecycle {
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
  readonly target: HTMLVideoElement | null;
}

const MuxVideoBase = MediaAttachMixin(CustomMediaElement('video', MuxMedia));

export class MuxVideo extends (MuxVideoBase as typeof MuxVideoBase & Constructor<MuxVideoLifecycle>) {
  static properties = {
    ...MuxVideoBase.properties,
    thumbnail: { type: String, empty: '' },
    storyboard: { type: String, empty: '' },
  };

  #storyboardTrack: HTMLTrackElement | null = null;

  constructor() {
    super();
    addComponent(this.host, new MuxData({ playerSoftwareName: 'mux-video' }));
    addComponent(this.host, new GoogleCast());
    // Slotted media swaps the render target; re-sync when it does.
    this.shadowRoot?.addEventListener('slotchange', () => this.#syncStoryboard());
    // Storyboards aren't generated for live streams; re-evaluate when the type is detected.
    this.host.addEventListener('streamtypechange', () => this.#syncStoryboard());
    // Covers both the `src` attribute and the `source` property (JS-only).
    this.host.addEventListener('sourcechange', () => this.#syncStoryboard());
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback?.(name, oldValue, newValue);
    if (name === 'storyboard') this.#syncStoryboard();
  }

  // Keeps the storyboard (thumbnail sprite) track attached to the active media
  // element. The URL comes from the `storyboard` attribute or is derived from
  // the current `source`.
  #syncStoryboard(): void {
    const target = this.target;
    if (!target) return;

    // Live streams have no storyboard; skip until the type is known to be otherwise.
    const src = this.host.streamType === StreamTypes.LIVE ? undefined : this.host.storyboard || undefined;

    if (!src) {
      this.#storyboardTrack?.remove();
      this.#storyboardTrack = null;
      return;
    }

    let track = this.#storyboardTrack;
    if (!track) {
      track = document.createElement('track');
      track.kind = 'metadata';
      track.label = 'thumbnails';
      track.default = true;
      this.#storyboardTrack = track;
    }

    if (track.getAttribute('src') !== src) track.setAttribute('src', src);
    if (track.parentNode !== target) {
      target.append(track);
      // Browsers ignore `default` for scripted tracks; enable it explicitly.
      const textTrack = track.track;
      if (textTrack && textTrack.mode === 'disabled') textTrack.mode = 'hidden';
    }
  }
}
