/**
 * The Mux Media over the SPF audio-only HLS engine. Sibling of `@videojs/spf/mux-video`; see that entry point for the
 * three-import-paths design the two share, and `@videojs/spf/hls-video` for why the Medias ship separately from
 * `@videojs/spf/hls`.
 *
 * Named for the flavor, not the composition underneath: the engine is the audio-only variant, but `mux-audio` is what
 * this plays and what the element and component are called.
 *
 * `MuxMediaProps` and `muxMediaDefaultProps` are the same Mux identity both flavors take, re-exported here so consuming
 * this Media costs no second import.
 */
export type { MuxContentData, MuxSourceBase } from '@videojs/media/dom/mux/source';
export type { MuxMediaAPI, MuxMediaProps } from '../mux-video/adapter';
export { muxMediaDefaultProps } from '../mux-video/adapter';
export { MuxAudioMedia } from './media';
