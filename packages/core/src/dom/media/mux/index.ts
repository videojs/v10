import { CastableMediaMixin } from '../castable';
import { type CastableMediaProps, castableMediaDefaultProps } from '../castable/types';
import { HlsMedia, type HlsMediaProps, hlsMediaDefaultProps } from '../hls';
import { MuxDataMediaMixin, type MuxDataMediaProps, muxDataMediaDefaultProps } from './mux-data';

export type { CastableMediaProps, HlsMediaProps, MuxDataMediaProps };

export interface MuxMediaProps extends HlsMediaProps, CastableMediaProps, MuxDataMediaProps {
  castSrc: string | undefined;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  ...hlsMediaDefaultProps,
  ...castableMediaDefaultProps,
  ...muxDataMediaDefaultProps,
  castSrc: undefined,
};

export class MuxVideoMedia extends MuxDataMediaMixin(CastableMediaMixin(HlsMedia)) implements MuxMediaProps {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

// TODO: HlsMedia extends HTMLVideoElementHost, we should extend
// HTMLAudioElementHost instead but this would require a HlsMediaMixin,
// keep it simple for now.
export class MuxAudioMedia extends MuxDataMediaMixin(CastableMediaMixin(HlsMedia)) implements MuxMediaProps {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
