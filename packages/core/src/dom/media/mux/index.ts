import { GoogleCastMixin } from '../google-cast';
import { type GoogleCastMediaProps, googleCastMediaDefaultProps } from '../google-cast/types';
import { HlsMedia, type HlsMediaProps, hlsMediaDefaultProps } from '../hls';
import { MuxDataMediaMixin, type MuxDataMediaProps, muxDataMediaDefaultProps } from './mux-data';

export type { GoogleCastMediaProps, HlsMediaProps, MuxDataMediaProps };

/** Combined props for Mux Video/Audio: HLS + Google Cast + Mux Data. */
export interface MuxMediaProps extends HlsMediaProps, GoogleCastMediaProps, MuxDataMediaProps {}

/** Defaults for {@link MuxMediaProps}. */
export const muxMediaDefaultProps: MuxMediaProps = {
  ...hlsMediaDefaultProps,
  ...googleCastMediaDefaultProps,
  ...muxDataMediaDefaultProps,
};

/** Media adapter for Mux Video — HLS playback with Mux Data analytics and Google Cast. */
export class MuxVideoMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia)) implements MuxMediaProps {
  /** Player software name reported to Mux Data. */
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

// TODO: HlsMedia extends HTMLVideoElementHost, we should extend
// HTMLAudioElementHost instead but this would require a HlsMediaMixin,
// keep it simple for now.
/** Media adapter for Mux Audio — HLS playback with Mux Data analytics and Google Cast. */
export class MuxAudioMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia)) implements MuxMediaProps {
  /** Player software name reported to Mux Data. */
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
