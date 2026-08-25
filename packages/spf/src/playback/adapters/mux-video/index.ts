/**
 * The Mux Media over the SPF HLS engine — Mux identity in, playback out.
 *
 * The hls.js-backed counterpart lives at `@videojs/media/dom/mux`. That is the PRD's three-import-paths design: the
 * import path picks the engine, and nothing else about the surface changes. The class is named for its flavor rather
 * than sharing that one's `MuxMedia`, so it stays symmetrical with `@videojs/spf/mux-audio` — which needs a distinct
 * name whatever this one is called.
 *
 * `MuxMediaMixin` and the `MuxMedia*` types are the Mux identity both flavors share, so they keep the unqualified name.
 */
export type { MuxContentData, MuxSourceBase } from '@videojs/media/dom/mux/source';
export type { MuxMediaAPI, MuxMediaProps } from './adapter';
export { MuxMediaMixin, muxMediaDefaultProps } from './adapter';
export { MuxVideoMedia } from './media';
