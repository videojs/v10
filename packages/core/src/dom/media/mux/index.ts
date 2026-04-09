import type { Constructor, MixinReturn } from '@videojs/utils/types';

import { CustomAudioElement, CustomVideoElement } from '../custom-media-element';
import { HlsMediaMixin, type HlsMediaProps } from '../hls';
import { AudioProxy, VideoProxy } from '../proxy';
import { MuxDataMediaMixin, type MuxDataMediaProps } from './mux-data';

export { isMuxVideoSrc, toPlaybackIdFromSrc, toVideoId } from './mux-data';

export interface MuxMediaProps extends HlsMediaProps, MuxDataMediaProps {}

export function MuxMediaMixin<Base extends Constructor<EventTarget>>(BaseClass: Base) {
  const MuxDataBase = MuxDataMediaMixin(HlsMediaMixin(BaseClass));

  class MuxMediaImpl extends (MuxDataBase as Constructor<HlsMediaProps & MuxDataMediaProps>) {
    static PLAYER_SOFTWARE_NAME = '';
  }

  return MuxMediaImpl as unknown as MixinReturn<Base, MuxMediaProps> & { PLAYER_SOFTWARE_NAME: string };
}

// These are used to infer the props from.
export class MuxMediaBase extends MuxMediaMixin(EventTarget) {
  static override PLAYER_SOFTWARE_NAME = '';
}

export class MuxVideoBase extends MuxMediaBase {
  static override PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudioBase extends MuxMediaBase {
  static override PLAYER_SOFTWARE_NAME = 'mux-audio';
}

// These are used by the web components because it needs to extend HTMLElement!
export class MuxCustomMedia extends MuxMediaMixin(CustomVideoElement) {}

export class MuxCustomVideo extends MuxMediaMixin(CustomVideoElement) {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxCustomAudio extends MuxMediaMixin(CustomAudioElement) {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}

// These are used by the React components.
export class MuxMedia extends MuxMediaMixin(VideoProxy) {}

export class MuxVideo extends MuxMediaMixin(VideoProxy) {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudio extends MuxMediaMixin(AudioProxy) {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
