import { HlsVideoMedia } from '../hls-video/media';
import { MuxMediaMixin } from './adapter';

const MuxVideoMediaBase = MuxMediaMixin(HlsVideoMedia);

/**
 * The Mux Media over the SPF HLS engine.
 *
 * Mirrors `@videojs/media/dom/mux`'s hls.js-backed `MuxMedia` — same class shape, same `src`/`source` relationship,
 * same derived `contentData` — over a different engine, though named for the flavor rather than sharing that class's
 * name. It carries no `engine` or `preferPlayback`: SPF publishes no engine-shaped config for a consumer to pass, so
 * the source is Mux identity and nothing else.
 *
 * `source.drm` licenses playback: a `drm.token` derives Mux's three license servers, and entries naming servers
 * outright override them. A source carrying neither prunes its encrypted renditions and reports unsupported DRM,
 * exactly as an engine with no EME does.
 */
export class MuxVideoMedia extends MuxVideoMediaBase {}
