import { MuxVideoAdapter } from '@videojs/mux-video';

export type { MuxSource, MuxVideoAdapterProps as MuxAudioAdapterProps } from '@videojs/mux-video';

// TODO(mux): audio extending video is upside down. The hls.js-backed Mux behavior should move to a shared base that a
// video and an audio adapter both extend; until then this class exists so audio installs by the media it plays and has
// a home for audio-only behavior.
export class MuxAudioAdapter extends MuxVideoAdapter {
  override attach(target: HTMLMediaElement): void {
    // SAFETY: this temporary subclass uses only the shared HTMLMediaElement behavior in the video adapter chain. The
    // Mux audio element has always supplied an <audio>; this signature makes that existing runtime contract explicit.
    const compatibleTarget = target as HTMLVideoElement;

    super.attach(compatibleTarget);
  }
}
