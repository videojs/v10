/**
 * The Mux Media over the SPF audio-only HLS engine. Sibling of
 * `@videojs/spf/mux`; see that entry point for the three-import-paths design the
 * two share, and `@videojs/spf/simple-hls` for why the Medias ship separately
 * from `@videojs/spf/hls`.
 *
 * `MuxMediaProps` and `muxMediaDefaultProps` are the same Mux identity both
 * flavors take, re-exported here so consuming this Media costs no second import.
 */
export type { MuxContentData, MuxSourceBase } from '@videojs/media/dom/mux/source';
export type { MuxMediaAPI, MuxMediaProps } from '../mux/adapter';
export { muxMediaDefaultProps } from '../mux/adapter';
export { MuxAudioOnlyMedia } from './media';
