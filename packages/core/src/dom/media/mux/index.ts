import { GoogleCastMixin } from '../google-cast';
import { type GoogleCastMediaProps, googleCastMediaDefaultProps } from '../google-cast/types';
import { HlsMedia, type HlsMediaProps, hlsMediaDefaultProps } from '../hls';
import { MuxDataMediaMixin, type MuxDataMediaProps, muxDataMediaDefaultProps } from './mux-data';

export type { GoogleCastMediaProps, HlsMediaProps, MuxDataMediaProps };

export interface MuxMediaProps extends HlsMediaProps, GoogleCastMediaProps, MuxDataMediaProps {}

export const muxMediaDefaultProps: MuxMediaProps = {
  ...hlsMediaDefaultProps,
  ...googleCastMediaDefaultProps,
  ...muxDataMediaDefaultProps,
};

export class MuxVideoMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia)) implements MuxMediaProps {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

// TODO: HlsMedia extends HTMLVideoElementHost, we should extend
// HTMLAudioElementHost instead but this would require a HlsMediaMixin,
// keep it simple for now.
export class MuxAudioMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia)) implements MuxMediaProps {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
