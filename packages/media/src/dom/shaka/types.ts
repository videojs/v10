import type shaka from '#shaka';
import type { HTMLVideoElementHost } from '../video-host';

/** The host contract the Shaka media mixins compose over. */
export type ShakaEngineHost = HTMLVideoElementHost & {
  readonly engine?: shaka.Player | null;
};
