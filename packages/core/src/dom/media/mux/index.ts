import { addLayer } from '../../../core/media/media-layer';
import { googleCast } from '../google-cast';
import { HlsMedia, type HlsMediaConfig, type HlsMediaProps, hlsMediaDefaultProps } from '../hls';
import { HTMLAudioElementHost } from '../html-audio-element-host';
import { HTMLVideoElementHost } from '../html-video-element-host';
import { muxData } from './mux-data';

export interface MuxMediaConfig extends HlsMediaConfig {}

export interface MuxMediaProps extends HlsMediaProps {
  config: MuxMediaConfig;
}

export const muxMediaDefaultProps: MuxMediaProps = {
  ...hlsMediaDefaultProps,
};

export class MuxVideoMedia extends HTMLVideoElementHost implements MuxMediaProps {
  static PLAYER_SOFTWARE_NAME = 'mux-video';

  constructor() {
    super();
    addLayer(this, new HlsMedia());
    googleCast().install(this);
    muxData().install(this);
  }

  get config(): MuxMediaConfig {
    return (this.next?.config as MuxMediaConfig | undefined) ?? muxMediaDefaultProps.config;
  }

  set config(value: MuxMediaConfig) {
    if (this.next) this.next.config = value;
  }
}

export class MuxAudioMedia extends HTMLAudioElementHost implements MuxMediaProps {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';

  constructor() {
    super();
    addLayer(this, new HlsMedia());
    googleCast().install(this);
    muxData().install(this);
  }

  get config(): MuxMediaConfig {
    return (this.next?.config as MuxMediaConfig | undefined) ?? muxMediaDefaultProps.config;
  }

  set config(value: MuxMediaConfig) {
    if (this.next) this.next.config = value;
  }
}
