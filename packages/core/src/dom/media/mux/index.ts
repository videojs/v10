import { HlsMedia } from '../hls';
import { MuxDataMediaMixin } from './mux-data';

export { isMuxVideoSrc, toPlaybackIdFromSrc, toVideoId } from './mux-data';

export class MuxVideoMedia extends MuxDataMediaMixin(HlsMedia) {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

// TODO: HlsMedia extends HTMLVideoElementHost, we should extend
// HTMLAudioElementHost instead but this would require a HlsMediaMixin,
// keep it simple for now.
export class MuxAudioMedia extends MuxDataMediaMixin(HlsMedia) {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
