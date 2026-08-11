/**
 * The Mux Media over the SPF HLS engine — Mux identity in, playback out.
 *
 * The hls.js-backed counterpart lives at `@videojs/media/dom/mux` and shares this
 * class's name and shape. That is the PRD's three-import-paths design: the import
 * path picks the engine, and nothing else about the surface changes.
 */
export type { MuxContentData, MuxSourceBase } from '@videojs/media/dom/mux/source';
export type { MuxMediaAPI, MuxMediaProps } from './adapter';
export { MuxMediaMixin, muxMediaDefaultProps } from './adapter';
export { MuxMedia } from './media';
