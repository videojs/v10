import { MuxVideoAdapter } from '@videojs/mux-video';

export type { MuxSource, MuxVideoAdapterProps as MuxAudioAdapterProps } from '@videojs/mux-video';

// TODO(mux): audio extending video is upside down. The hls.js-backed Mux behavior should move to a shared base that a
// video and an audio adapter both extend; until then this class exists so audio installs by the media it plays and has
// a home for audio-only behavior.
// The video base names `'video'` as a literal, which a subclass cannot widen; the cast drops it from the static side.
type MuxAudioBase = Omit<typeof MuxVideoAdapter, 'host'> & (new () => MuxVideoAdapter);

export class MuxAudioAdapter extends (MuxVideoAdapter as MuxAudioBase) {
  static readonly host = 'audio';
}
