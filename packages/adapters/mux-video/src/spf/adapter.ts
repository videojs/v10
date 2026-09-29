import { MEDIA_BRANDS } from '@videojs/media';
import { HlsVideoAdapter, type HlsVideoAdapterProps } from '@videojs/spf/hls-video';

import { type MuxAdapterProps, MuxMixin } from './mixin';
import { MUX_VIDEO_SPF_MEDIA } from './predicate';

/**
 * The Mux Media over the SPF HLS engine.
 *
 * Mirrors `@videojs/mux-video`'s hls.js-backed `MuxVideoAdapter` — same class shape, same `src`/`source` relationship,
 * same derived `contentData` — over a different engine, though named for the flavor rather than sharing that class's
 * name. It carries no `engine` or `preferPlayback`: SPF publishes no engine-shaped config for a consumer to pass, so
 * the source is Mux identity and nothing else.
 *
 * `source.drm` licenses playback: a `drm.token` derives Mux's three license servers, and entries naming servers
 * outright override them. A source carrying neither prunes its encrypted renditions and reports unsupported DRM,
 * exactly as an engine with no EME does.
 */
export class MuxVideoAdapter extends MuxMixin(HlsVideoAdapter) {
  static override readonly [MEDIA_BRANDS]: readonly string[] = [...HlsVideoAdapter[MEDIA_BRANDS], MUX_VIDEO_SPF_MEDIA];

  static override readonly defaultProps: Omit<HlsVideoAdapterProps, 'src' | 'source'> & MuxAdapterProps = {
    ...HlsVideoAdapter.defaultProps,
    src: '',
    source: null,
  };
}
