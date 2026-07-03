import { effect, untrack } from '@videojs/spf';
import type { SimpleHlsMediaAPI } from '@videojs/spf/hls';
import type { Constructor } from '@videojs/utils/types';
import type { MediaVideoRenditionCapability, MediaVideoTrackCapability } from '../../../core/media/types';

type SimpleHlsEngine = SimpleHlsMediaAPI['engine'];

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
  MediaVideoRenditionCapability;

/** A video rendition as parsed onto the engine's presentation (each SPF video track is one quality level). */
type SpfVideoTrack = Extract<
  NonNullable<NonNullable<ReturnType<SimpleHlsEngine['state']['presentation']['get']>>['selectionSets']>[number],
  { type: 'video' }
>['switchingSets'][number]['tracks'][number];

function videoTracksOf(engine: SimpleHlsEngine): SpfVideoTrack[] {
  const presentation = engine.state.presentation.get();
  const videoSet = presentation?.selectionSets?.find((set) => set.type === 'video');
  return videoSet?.switchingSets[0]?.tracks ?? [];
}

function toFrameRate(frameRate: SpfVideoTrack['frameRate']): number | undefined {
  if (!frameRate) return undefined;
  const { frameRateNumerator, frameRateDenominator } = frameRate;
  return frameRateDenominator ? frameRateNumerator / frameRateDenominator : frameRateNumerator;
}

/**
 * Projects the SPF engine's video renditions onto the media element's
 * `videoTracks` / `videoRenditions` lists, and wires user rendition selection
 * back to the engine's `userVideoTrackSelection` (a partial `{ id }` pins a
 * quality level; clearing it re-enables ABR).
 *
 * Unlike hls.js — where the engine persists and events drive the projection —
 * the SPF adapter rebuilds its engine on every `src` assignment, so the
 * subscriptions are re-wired on each src change (see the `src` override).
 *
 * Requires the media-tracks mixin (track-list infrastructure) to be applied
 * earlier in the chain so the host exposes `addVideoTrack`, `videoRenditions`,
 * and friends.
 */
export function SimpleHlsMediaMediaTracksMixin<Base extends Constructor<MediaTracksHost>>(BaseClass: Base) {
  class SimpleHlsMediaMediaTracks extends (BaseClass as Constructor<MediaTracksHost>) {
    #disconnect: AbortController | null = null;
    /** Ids of the renditions currently projected, in order — used to skip rebuilds on segment resolution. */
    #renditionSignature = '';

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
      super.destroy();
    }

    #connect(): void {
      this.#disconnect?.abort();
      const controller = new AbortController();
      this.#disconnect = controller;
      const { signal } = controller;
      const { engine } = this;

      this.videoRenditions.addEventListener('change', this.#switchRendition, { signal });

      const disposeEffects = [
        // Track `presentation` only; active-rendition reflection reads
        // `selectedVideoTrackId` untracked so a resolve doesn't re-rebuild.
        effect(() => this.#projectRenditions(engine, videoTracksOf(engine))),
        effect(() => this.#reflectActiveRendition(engine.state.selectedVideoTrackId.get())),
      ];

      signal.addEventListener(
        'abort',
        () => {
          for (const dispose of disposeEffects) dispose();
        },
        { once: true }
      );
    }

    #getSignaturesFor(tracks: SpfVideoTrack[]) {
      return tracks.map((track) => track.id).join('|');
    }

    #projectRenditions(engine: SimpleHlsEngine, tracks: SpfVideoTrack[]): void {
      const signature = this.#getSignaturesFor(tracks);
      if (signature === this.#renditionSignature) return;
      this.#renditionSignature = signature;

      this.#removeVideoTracks();
      if (!tracks.length) return;

      const videoTrack = this.addVideoTrack('main');
      videoTrack.selected = true;

      for (const track of tracks) {
        const rendition = videoTrack.addRendition(
          track.url,
          track.width,
          track.height,
          track.codecs?.join(','),
          track.bandwidth,
          toFrameRate(track.frameRate)
        );
        rendition.id = track.id;
      }

      this.#reflectActiveRendition(untrack(() => engine.state.selectedVideoTrackId.get()));
    }

    #reflectActiveRendition(activeId: string | undefined): void {
      for (const rendition of this.videoRenditions) {
        rendition.active = rendition.id === activeId;
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
  }

  return SimpleHlsMediaMediaTracks as unknown as Base;
}
