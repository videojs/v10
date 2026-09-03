import { HlsVideoAdapter, type HlsVideoAdapterProps } from '@videojs/spf/hls-video';

import { type MuxAdapterProps, MuxMixin } from './mixin';

/**
 * The Mux Media over the SPF HLS engine.
 *
 * Mirrors `@videojs/mux-video`'s hls.js-backed `MuxVideoAdapter` — same class shape, same `src`/`source` relationship,
 * same derived `contentData` — over a different engine, though named for the flavor rather than sharing that class's
 * name. It carries no `engine` or `preferPlayback`: SPF publishes no engine-shaped config for a consumer to pass, so
 * the source is Mux identity and nothing else.
 *
 * `source.drm` is accepted but inert. SPF prunes encrypted renditions and reports unsupported DRM, and
 * `alternativeMediaSuggestion` points at the hls.js-backed import, so a protected source fails with copy that says
 * where to go.
 */
export class MuxVideoAdapter extends MuxMixin(HlsVideoAdapter) {
  static override readonly defaultProps: Omit<HlsVideoAdapterProps, 'src'> & MuxAdapterProps = {
    ...HlsVideoAdapter.defaultProps,
    src: '',
    source: null,
  };
}
