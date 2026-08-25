import type shaka from 'shaka-player/dist/shaka-player.compiled-es2021';

import type { HTMLVideoElementHost } from '../video-host';

/** The host contract the Shaka media mixins compose over. */
export type ShakaEngineHost = HTMLVideoElementHost & {
  readonly engine?: shaka.Player | null;
};
