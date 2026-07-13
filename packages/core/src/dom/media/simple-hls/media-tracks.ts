import { type Composition, computed, effect, untrack } from '@videojs/spf';
import type { SimpleHlsEngineContext, SimpleHlsEngineState } from '@videojs/spf/hls';
import {
  type AudioTrack,
  dedupedAudioTracks,
  dedupedVideoTracks,
  frameRateToNumber,
  toUserAudioTrackSelection,
  toUserVideoTrackSelection,
  type VideoTrack,
} from '@videojs/spf/media-tracks';
import type { Constructor } from '@videojs/utils/types';
import type {
  MediaAudioTrackCapability,
  MediaVideoRenditionCapability,
  MediaVideoTrackCapability,
} from '../../../core/media/types';

type SimpleHlsEngineHost = {
  readonly engine: Composition<SimpleHlsEngineState, SimpleHlsEngineContext>;
  destroy?(): void;
};

type MediaTracksHost = SimpleHlsEngineHost &
  MediaVideoTrackCapability &
  MediaAudioTrackCapability &
  MediaVideoRenditionCapability;

/** Two track lists carry the same set when their id sequences match. */
const sameIds = (a: { id: string }[], b: { id: string }[]): boolean =>
  a.length === b.length && a.every((item, i) => item.id === b[i]!.id);

/**
 * Projects the SPF engine's presentation onto the media element's
 * `videoRenditions` / `audioTracks` lists, and wires user selection back to the
 * engine's `userVideoTrackSelection` / `userAudioTrackSelection` signals.
 *
 * Requires the media-tracks mixin (track-list infrastructure) earlier in the
 * chain so the host exposes `addVideoTrack`, `videoRenditions`, and friends.
 */
export function SimpleHlsMediaMediaTracksMixin<Base extends Constructor<MediaTracksHost>>(BaseClass: Base) {
  class SimpleHlsMediaMediaTracks extends (BaseClass as Constructor<MediaTracksHost>) {
    #abort = new AbortController();
    // Memoized SPF model — the last `computed` result per type — so a DOM
    // selection maps back to the engine's match criteria by id via the SPF
    // selection helpers (the DOM lists carry only DOM-shape props).
    #renditions: VideoTrack[] = [];
    #audioTracks: AudioTrack[] = [];

    constructor(...args: any[]) {
      super(...args);

      const { state } = this.engine;
      const { signal } = this.#abort;

      const renditionsSignal = computed(() => dedupedVideoTracks(state.presentation.get()), { equals: sameIds });
      const audioTracksSignal = computed(() => dedupedAudioTracks(state.presentation.get()), { equals: sameIds });

      // Rebuild video renditions when the set changes; seed `active` from the
      // current resolved selection (read untracked — `active` deltas are the
      // reflection effect's job).
      const reflectRenditions = () => {
        const renditions = renditionsSignal.get();
        this.#renditions = renditions;
        this.#removeVideoTracks();
        if (!renditions.length) return;

        const videoTrack = this.addVideoTrack('main');
        videoTrack.selected = true;

        const selectedId = untrack(() => state.selectedVideoTrackId.get());
        for (const rendition of renditions) {
          const domRendition = videoTrack.addRendition(
            '',
            rendition.width,
            rendition.height,
            rendition.codecs.join(','),
            rendition.bandwidth,
            rendition.frameRate ? frameRateToNumber(rendition.frameRate) : undefined
          );
          domRendition.id = rendition.id;
          domRendition.active = rendition.id === selectedId;
        }
      };

      const reflectSelectedVideo = () => {
        const selectedId = state.selectedVideoTrackId.get();
        for (const rendition of this.videoRenditions) {
          rendition.active = rendition.id === selectedId;
        }
      };

      // Rebuild audio tracks when the set changes; seed `enabled` from the
      // current resolved selection.
      const reflectAudioTracks = () => {
        const tracks = audioTracksSignal.get();
        this.#audioTracks = tracks;
        this.#removeAudioTracks();
        if (!tracks.length) return;

        const selectedId = untrack(() => state.selectedAudioTrackId.get());
        for (const track of tracks) {
          const domTrack = this.addAudioTrack(track.default ? 'main' : 'alternative', track.name, track.language ?? '');
          domTrack.id = track.id;
          domTrack.enabled = track.id === selectedId;
        }
      };

      const reflectSelectedAudio = () => {
        const selectedId = state.selectedAudioTrackId.get();
        for (const track of this.audioTracks) {
          track.enabled = track.id === selectedId;
        }
      };

      const effectCleanups = [
        effect(reflectRenditions),
        effect(reflectSelectedVideo),
        effect(reflectAudioTracks),
        effect(reflectSelectedAudio),
      ];

      this.videoRenditions.addEventListener('change', this.#selectRendition, { signal });
      this.audioTracks.addEventListener('change', this.#selectAudio, { signal });
      signal.addEventListener('abort', () => effectCleanups.forEach((cleanup) => cleanup()), { once: true });
    }

    destroy(): void {
      this.#abort.abort();
      this.#removeVideoTracks();
      this.#removeAudioTracks();
      super.destroy?.();
    }

    // Manual quality pin → the chosen rendition's width/height/bandwidth as the
    // match criteria (the properties renditions were deduped on).
    // `selectedIndex === -1` (Auto) clears the pin, resuming ABR.
    #selectRendition = () => {
      const { userVideoTrackSelection } = this.engine.state;
      const index = this.videoRenditions.selectedIndex;
      const domRendition = index < 0 ? undefined : this.videoRenditions[index];
      const rendition = this.#renditions.find((candidate) => candidate.id === domRendition?.id);
      userVideoTrackSelection.set(toUserVideoTrackSelection(rendition));
    };

    #selectAudio = () => {
      const { selectedAudioTrackId, userAudioTrackSelection } = this.engine.state;
      const current = [...this.audioTracks].find((track) => track.id === selectedAudioTrackId.get());

      // `enabled` is not exclusive like video `selected`, so prefer a newly
      // enabled track over the one that is already playing.
      const enabled = [...this.audioTracks].filter((track) => track.enabled);
      const target = enabled.find((track) => track !== current) ?? enabled[0];
      if (!target) return;

      // Disable the rest so future change events resolve unambiguously.
      for (const track of enabled) {
        if (track !== target) track.enabled = false;
      }
      // Skip the write when the enabled track is already the resolved one
      // that's this projection's own reflection (or a no-op re-affirm), not a user switch.
      if (target === current) return;

      const audioTrack = this.#audioTracks.find((candidate) => candidate.id === target.id);
      userAudioTrackSelection.set(toUserAudioTrackSelection(audioTrack));
    };

    #removeVideoTracks() {
      for (const videoTrack of [...this.videoTracks]) this.removeVideoTrack(videoTrack);
    }

    #removeAudioTracks() {
      for (const audioTrack of [...this.audioTracks]) this.removeAudioTrack(audioTrack);
    }
  }

  return SimpleHlsMediaMediaTracks as unknown as Base;
}
