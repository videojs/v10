import type {
  AddCuesMessage,
  CueSegmentMeta,
  TextTracksActor,
  TextTracksActorContext,
  TextTracksActorMessage,
} from '../text-tracks';
export type { AddCuesMessage, CueSegmentMeta, TextTracksActor, TextTracksActorContext, TextTracksActorMessage };
/** TextTrack actor: wraps all text tracks on a media element, owns cue operations. */
export declare function createTextTracksActor(mediaElement: HTMLMediaElement): TextTracksActor<VTTCue>;
//# sourceMappingURL=text-tracks.d.ts.map
