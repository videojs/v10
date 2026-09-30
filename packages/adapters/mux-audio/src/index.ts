import { MEDIA_BRANDS } from '@videojs/media';
import { MuxVideoAdapter } from '@videojs/mux-video';

import { MUX_AUDIO_BRAND } from './predicate';

export type { MuxSource, MuxVideoAdapterProps as MuxAudioAdapterProps } from '@videojs/mux-video';
export { isMuxAudioAdapter } from './predicate';

// TODO(mux): audio extending video is upside down. The hls.js-backed Mux behavior should move to a shared base that a
// video and an audio adapter both extend; until then this class exists so audio installs by the media it plays and has
// a home for audio-only behavior.
export class MuxAudioAdapter extends MuxVideoAdapter {
  // It plays over hls.js like the Mux video it extends, but it isn't Mux video.
  static override readonly [MEDIA_BRANDS]: readonly string[] = [
    ...MuxVideoAdapter[MEDIA_BRANDS].filter((brand) => brand !== '@videojs/mux-video'),
    MUX_AUDIO_BRAND,
  ];
}
