import { effect, untrack } from '@videojs/spf';
import type { SimpleHlsEngineState, SimpleHlsMediaAPI } from '@videojs/spf/hls';
import type { Constructor } from '@videojs/utils/types';
import type {
  MediaAudioTrackCapability,
  MediaVideoRenditionCapability,
  MediaVideoTrackCapability,
} from '../../../core/media/types';

type SimpleHlsEngine = SimpleHlsMediaAPI['engine'];
/** A video rendition descriptor as published on the engine's `videoRenditions` slot. */
type VideoRenditionInfo = NonNullable<SimpleHlsEngineState['videoRenditions']>[number];
/** An audio track descriptor as published on the engine's `audioTracks` slot. */
type AudioTrackInfo = NonNullable<SimpleHlsEngineState['audioTracks']>[number];

/**
 * Host surface the projection reads from: the SPF adapter (engine + src) plus
 * the media-tracks list infrastructure applied earlier in the mixin chain.
 */
type MediaTracksHost = {
  readonly engine: SimpleHlsEngine;
  get src(): string;
  set src(value: string);
  destroy(): void;
} & MediaVideoTrackCapability &
  MediaVideoRenditionCapability &
  MediaAudioTrackCapability;

/**
 * Projects the SPF engine's video renditions and audio tracks onto the media
 * element's `videoTracks` / `videoRenditions` / `audioTracks` lists, and wires
 * user selection back to the engine's `userVideoTrackSelection` /
 * `userAudioTrackSelection`.
 *
 * Unlike hls.js — where the engine persists and events drive the projection —
 * the SPF adapter rebuilds its engine on every `src` assignment, so the
 * subscriptions are re-wired on each src change (see the `src` override).
 *
 * Requires the media-tracks mixin (track-list infrastructure) to be applied
 * earlier in the chain so the host exposes `addVideoTrack`, `videoRenditions`,
 * `audioTracks`, and friends.
 */
export function SimpleHlsMediaMediaTracksMixin<Base extends Constructor<MediaTracksHost>>(BaseClass: Base) {
  class SimpleHlsMediaMediaTracks extends (BaseClass as Constructor<MediaTracksHost>) {
    #disconnect: AbortController | null = null;

    constructor(...args: any[]) {
      super(...args);
      this.#connect();
    }

    get src(): string {
      return super.src;
    }

    set src(value: string) {
      // The canonical adapter destroys the engine (and its signals) on every
      // src change and creates a fresh one, so we re-wire the projection against
      // it. If the adapter ever moves to in-place source replacement (an open
      // question in source-replacement.md / engine-adapter-integration.md), the
      // engine becomes stable and this collapses to a one-time constructor wire.
      this.#disconnect?.abort();
      super.src = value;
      this.#connect();
    }

    destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#removeVideoTracks();
      this.#removeAudioTracks();
      super.destroy();
    }

    #connect(): void {
      this.#disconnect?.abort();
      this.#disconnect = new AbortController();
      const { signal } = this.#disconnect;
      const { engine } = this;

      this.videoRenditions.addEventListener('change', this.#switchRendition, { signal });
      this.audioTracks.addEventListener('change', this.#switchAudioTrack, { signal });

      const disposeEffects = [
        // The engine dedupes its projections (emits a new array only when the set
        // changes), so these rebuild only on real changes. Selection reflection
        // (active rendition / enabled audio track) reads the resolved id in its
        // own effect.
        effect(() => this.#projectRenditions(engine, engine.state.videoRenditions.get() ?? [])),
        effect(() => this.#reflectActiveRendition(engine.state.selectedVideoTrackId.get())),
        effect(() => this.#reflectSelectedRendition(engine.state.userVideoTrackSelection.get()?.id)),
        effect(() => this.#projectAudioTracks(engine, engine.state.audioTracks.get() ?? [])),
        effect(() => this.#reflectEnabledAudioTrack(engine.state.selectedAudioTrackId.get())),
      ];

      disposeEffects.forEach((dispose) => {
        signal.addEventListener('abort', dispose, { once: true });
      });
    }

    // -------------------------------------------------------------------------
    // Video renditions
    // -------------------------------------------------------------------------

    #projectRenditions(engine: SimpleHlsEngine, renditions: VideoRenditionInfo[]): void {
      this.#removeVideoTracks();
      if (!renditions.length) return;

      const videoTrack = this.addVideoTrack('main');
      videoTrack.selected = true;

      for (const info of renditions) {
        const rendition = videoTrack.addRendition(
          info.url,
          info.width,
          info.height,
          info.codecs?.join(','),
          info.bandwidth,
          toFrameRate(info.frameRate)
        );
        rendition.id = info.id;
      }

      this.#reflectActiveRendition(untrack(() => engine.state.selectedVideoTrackId.get()));
      this.#reflectSelectedRendition(untrack(() => engine.state.userVideoTrackSelection.get()?.id));
    }

    #reflectActiveRendition(activeId: string | undefined): void {
      for (const rendition of this.videoRenditions) {
        rendition.active = rendition.id === activeId;
      }
    }

    #reflectSelectedRendition(selectedId: string | undefined): void {
      for (const rendition of this.videoRenditions) {
        rendition.selected = !!selectedId && rendition.id === selectedId;
      }
    }

    #switchRendition = () => {
      const { engine } = this;
      const { selectedIndex } = this.videoRenditions;

      // -1 clears the manual pin and hands quality back to ABR.
      if (selectedIndex === -1) {
        if (engine.state.userVideoTrackSelection.get()) engine.state.userVideoTrackSelection.set(undefined);
        return;
      }

      const id = this.videoRenditions[selectedIndex]?.id;
      if (!id || engine.state.userVideoTrackSelection.get()?.id === id) return;
      engine.state.userVideoTrackSelection.set({ id });
    };

    #removeVideoTracks(): void {
      for (const videoTrack of this.videoTracks) {
        this.removeVideoTrack(videoTrack);
      }
    }

    // -------------------------------------------------------------------------
    // Audio tracks (one per language)
    // -------------------------------------------------------------------------

    #projectAudioTracks(engine: SimpleHlsEngine, tracks: AudioTrackInfo[]): void {
      this.#removeAudioTracks();
      if (!tracks.length) return;

      for (const info of tracks) {
        const audioTrack = this.addAudioTrack(info.default ? 'main' : 'alternative', info.name, info.language ?? '');
        audioTrack.id = info.id;
      }

      this.#reflectEnabledAudioTrack(untrack(() => engine.state.selectedAudioTrackId.get()));
    }

    #reflectEnabledAudioTrack(selectedId: string | undefined): void {
      const infos = untrack(() => this.engine.state.audioTracks.get()) ?? [];
      for (const track of this.audioTracks) {
        const info = infos.find((candidate) => candidate.id === track.id);
        track.enabled = !!selectedId && !!info?.trackIds.includes(selectedId);
      }
    }

    #switchAudioTrack = () => {
      const { engine } = this;
      const infos = engine.state.audioTracks.get() ?? [];
      const selectedId = engine.state.selectedAudioTrackId.get();
      const currentInfo = infos.find((info) => info.trackIds.includes(selectedId ?? ''));

      // `enabled` isn't exclusive like video `selected`, so prefer a newly
      // enabled track over the one already playing.
      const enabled = [...this.audioTracks].filter((track) => track.enabled);
      const target = enabled.find((track) => track.id !== currentInfo?.id) ?? enabled[0];
      if (!target) return;

      // Disable the rest so future change events resolve unambiguously.
      for (const track of enabled) {
        if (track !== target) track.enabled = false;
      }

      // No-op when the target already matches the engine selection — this fires
      // for our own `enabled` reflection (which dispatches the same `change`).
      if (target.id === currentInfo?.id) return;

      const info = infos.find((candidate) => candidate.id === target.id);
      if (!info) return;
      engine.state.userAudioTrackSelection.set(
        info.language ? { language: info.language, name: info.name } : { name: info.name }
      );
    };

    #removeAudioTracks(): void {
      for (const audioTrack of this.audioTracks) {
        this.removeAudioTrack(audioTrack);
      }
    }
  }

  return SimpleHlsMediaMediaTracks as unknown as Base;
}

/** Reduce the model's `FrameRate` (num/den) to the single number a DOM `VideoRendition` expects. */
function toFrameRate(frameRate: VideoRenditionInfo['frameRate']): number | undefined {
  if (!frameRate) return undefined;
  const { frameRateNumerator, frameRateDenominator } = frameRate;
  return frameRateDenominator ? frameRateNumerator / frameRateDenominator : frameRateNumerator;
}
