import { MuxMedia } from '@videojs/mux-video';

export type { MuxMediaProps as MuxAudioMediaProps, MuxSource } from '@videojs/mux-video';
export { muxMediaDefaultProps } from '@videojs/mux-video';

// TODO(mux): audio extending video is upside down. The hls.js-backed Mux behavior should move to a shared base that a
// video and an audio Media both extend; until then this class exists so audio installs by the media it plays and has a
// home for audio-only behavior.
export class MuxAudioMedia extends MuxMedia {}
