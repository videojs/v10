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
    // Slotted media swaps the render target; re-sync when it does.
    this.shadowRoot?.addEventListener('slotchange', () => this.#syncStoryboard());
    // Storyboards aren't generated for live streams; re-evaluate when the type is detected.
    this.host.addEventListener('streamtypechange', () => this.#syncStoryboard());
    // Covers both the `src` attribute and the `source` property (JS-only).
    this.host.addEventListener('sourcechange', () => {
      this.#reflectSrc();
      this.#syncStoryboard();
    });
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'storyboard') this.#syncStoryboard();
  }

  // Mirrors the host `src` back to the element's `src` attribute when the
  // JS-only `source` property derives a new URL, so `getAttribute('src')`
  // always matches the active playback URL.
  #reflectSrc(): void {
    const src = this.host.src;
    if (src) {
      if (this.getAttribute('src') !== src) this.setAttribute('src', src);
    } else if (this.hasAttribute('src')) {
      this.removeAttribute('src');
    }
  }

  // The storyboard <track> node can be cloned and replaced out from under us
  // (e.g. hls.js clearing cues in `HlsJsMediaMetadataTracksMixin`), so query
  // for it instead of holding a reference that can go stale.
  #storyboardTracks(): HTMLTrackElement[] {
    return [
      ...(this.shadowRoot?.querySelectorAll<HTMLTrackElement>('track[data-storyboard]') ?? []),
      ...this.querySelectorAll<HTMLTrackElement>('track[data-storyboard]'),
    ];
  }

  // Keeps the storyboard (thumbnail sprite) track attached to the active media
  // element. The URL comes from the `storyboard` attribute or is derived from
  // the current `source`.
  #syncStoryboard(): void {
    const target = this.target;
    if (!target) return;

    // Live streams have no storyboard; skip until the type is known to be otherwise.
    const src = this.host.streamType === StreamTypes.LIVE ? undefined : this.host.storyboard || undefined;

    const tracks = this.#storyboardTracks();
    let track = src ? (tracks.find((el) => el.parentNode === target) ?? null) : null;

    // Remove stale tracks: previous render targets, cleared sources, live streams.
    for (const el of tracks) {
      if (el !== track) el.remove();
    }

    if (!src) return;

    if (!track) {
      track = document.createElement('track');
      track.kind = 'metadata';
      track.label = 'thumbnails';
      track.default = true;
      track.setAttribute('data-storyboard', '');
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
