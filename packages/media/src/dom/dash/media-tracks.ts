import type { Constructor } from '@videojs/utils/types';
import * as dashjs from 'dashjs';

import type { MediaVideoRenditionCapability, MediaVideoTrackCapability } from '../../core/types';
import type { HTMLVideoElementHost } from '../video-host';

type DashEngineHost = HTMLVideoElementHost & {
  readonly engine?: dashjs.MediaPlayerClass | null;
};

type MediaTracksHost = DashEngineHost & MediaVideoTrackCapability & MediaVideoRenditionCapability;

/**
 * Mirrors the dash.js video representations of the active stream into the media element's `videoRenditions` list, and
 * wires user selection back to `engine.setRepresentationForTypeById()`.
 *
 * DASH representations belong to an adaptation set rather than to a flat list, so they are hung off a single `'main'`
 * video track — the one the renditions of the stream that is playing are read from.
 *
 * Requires the media-tracks mixin (track-list infrastructure) to be applied earlier in the chain so the host exposes
 * `addVideoTrack`, `videoRenditions`, and friends.
 */
export function DashMediaMediaTracksMixin<Base extends Constructor<MediaTracksHost>>(BaseClass: Base) {
  class DashMediaMediaTracks extends (BaseClass as Constructor<MediaTracksHost>) {
    // The source is announced as a whole, so the URL it resolved to last is what
    // tells a new stream apart from a settings-only change.
    #src = '';
    #isBitrateSwitchingOff = false;

    constructor(...args: any[]) {
      super(...args);

      const { engine } = this;
      if (!engine) return;

      engine.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, this.#onStreamInitialized);
      engine.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, this.#onQualityChangeRendered);

      this.addEventListener('sourcechange', this.#onSourceChange);
      this.videoRenditions.addEventListener('change', this.#switchRendition);
    }

    destroy() {
      const { engine } = this;

      engine?.off(dashjs.MediaPlayer.events.STREAM_INITIALIZED, this.#onStreamInitialized);
      engine?.off(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, this.#onQualityChangeRendered);

      this.removeEventListener('sourcechange', this.#onSourceChange);
      this.videoRenditions.removeEventListener('change', this.#switchRendition);

      this.#removeVideoTracks();

      super.destroy();
    }

    // Every stream — a new source, and every period of a multi-period manifest —
    // announces the representations that are playable from here on, so the list
    // is rebuilt rather than added to.
    #onStreamInitialized = (event: dashjs.StreamInitializedEvent) => {
      const { engine } = this;
      if (!engine || event.error) return;

      this.#reset();

      const videoTrack = this.addVideoTrack('main');

      // Selecting the track is what puts its renditions in `videoRenditions`, so
      // it happens before any is added and their `addrendition` events land.
      videoTrack.selected = true;

      for (const representation of engine.getRepresentationsByType('video')) {
        const rendition = videoTrack.addRendition(
          // DASH representations are segment templates rather than a single
          // playable URL, so they are identified by their manifest id alone.
          '',
          representation.width || undefined,
          representation.height || undefined,
          representation.codecs ?? undefined,
          toBitrate(representation),
          representation.frameRate || undefined
        );

        rendition.id = representation.id;
      }

      // dash.js reports a switch only once it renders one, so the representation
      // the stream starts on comes from the engine.
      this.#setActiveRendition(engine.getCurrentRepresentationForType('video')?.id);
    };

    #onQualityChangeRendered = (event: dashjs.QualityChangeRenderedEvent) => {
      if (event.mediaType !== 'video') return;

      this.#setActiveRendition(event.newRepresentation?.id);
    };

    #switchRendition = () => {
      const { engine } = this;
      if (!engine) return;

      // Multiple renditions can be selected, but dash.js plays exactly one
      // representation at a time, so the first one wins.
      const selected = [...this.videoRenditions].find((rendition) => rendition.selected);

      if (!selected?.id) {
        this.#restoreBitrateSwitching();
        return;
      }

      this.#isBitrateSwitchingOff = true;
      engine.updateSettings(autoSwitchBitrate(false));
      engine.setRepresentationForTypeById('video', selected.id, true);
    };

    #onSourceChange = () => {
      const srcChanged = this.src !== this.#src;

      this.#src = this.src;

      // A new stream announces renditions of its own, and the one that is going
      // away leaves nothing to select from.
      if (srcChanged) {
        this.#reset();
        return;
      }

      // Applying `engine.dashJs` resets dash.js settings wholesale, which drops
      // the switching this mixin turned off; re-apply the selection it was for.
      if (this.#isBitrateSwitchingOff && this.#isEngineBitrateSwitchingOn()) this.#switchRendition();
    };

    // dash.js's own reading rather than what this mixin last asked for: settings
    // are reset out from under it, and only the engine knows whether that
    // happened. Announcing a source that changed nothing must leave the pinned
    // representation alone, or an inline React `source` prop would interrupt
    // playback on every render.
    #isEngineBitrateSwitchingOn() {
      return this.engine?.getSettings().streaming?.abr?.autoSwitchBitrate?.video !== false;
    }

    #setActiveRendition(id: string | undefined) {
      for (const rendition of this.videoRenditions) {
        rendition.active = id !== undefined && rendition.id === id;
      }
    }

    #reset() {
      this.#removeVideoTracks();
      this.#restoreBitrateSwitching();
    }

    // Only ever undoes what a selection turned off, so dash.js settings that
    // switch bitrates manually on purpose are left as configured.
    #restoreBitrateSwitching() {
      if (!this.#isBitrateSwitchingOff) return;

      this.#isBitrateSwitchingOff = false;
      this.engine?.updateSettings(autoSwitchBitrate(true));
    }

    #removeVideoTracks() {
      for (const videoTrack of this.videoTracks) {
        this.removeVideoTrack(videoTrack);
      }
    }
  }

  return DashMediaMediaTracks as unknown as Base;
}

/**
 * Dash.js plays a pinned representation only while its own bitrate switching is off, so selecting a rendition takes
 * this setting alongside the representation.
 */
function autoSwitchBitrate(video: boolean): dashjs.MediaPlayerSettingClass {
  return { streaming: { abr: { autoSwitchBitrate: { video } } } };
}

/**
 * Representation bitrate in bits per second. `bandwidth` is what the manifest declares; the kbit reading is dash.js's
 * own derived value, kept as a fallback for representations that carry one without the other.
 */
function toBitrate(representation: dashjs.Representation): number | undefined {
  const { bandwidth, bitrateInKbit } = representation;
  if (bandwidth) return bandwidth;

  return bitrateInKbit ? bitrateInKbit * 1000 : undefined;
}
