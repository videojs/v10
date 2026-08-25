/**
 * The Media over the HLS engine — SPF's public playback surface.
 *
 * SPF differs from engines like hls.js in that it exposes no engine-shaped API of its own: the `@videojs/media` facade
 * _is_ how a composed engine is consumed. `HlsVideoMedia` is that facade, and this entry point is separate from
 * `@videojs/spf/hls` so wiring the engine directly doesn't pull the Media (or `@videojs/media`) in with it.
 */
export type { HlsVideoMediaAPI, HlsVideoMediaError, HlsVideoMediaProps, HlsVideoMediaStreamType } from './adapter';
export { HlsVideoMediaElement, HlsVideoMediaMixin, hlsVideoMediaDefaultProps } from './adapter';
export { HlsVideoMedia } from './media';
export { HlsVideoMediaMediaTracksMixin } from './media-tracks';
