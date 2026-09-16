import type { HTMLVideoAdapter } from '@videojs/media/dom';
import type shaka from 'shaka-player/dist/shaka-player.compiled-es2021';

/** The host contract the Shaka media mixins compose over. */
export type ShakaEngineHost = HTMLVideoAdapter & {
  readonly engine?: shaka.Player | null;
};
