import { HlsMedia } from '../hls/server';

export class MuxVideoMedia extends HlsMedia {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudioMedia extends HlsMedia {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
