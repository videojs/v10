/**
 * The DRM-composed HLS engine's own entry (`@videojs/spf/hls-drm`), separate
 * from `@videojs/spf/hls` so DRM-free consumers of the engines entry never
 * carry the EME machinery, and so this entry is the DRM composition's own
 * size budget.
 */
// The `source.drm`-shaped license-server contract the engine's required `drm`
// config takes — structurally identical to `@videojs/media`'s, so
// adapter-held configs pass through without the package dependency.
export type { DrmSystemConfig, DrmSystemsConfig } from '../../../media/drm';
export type {
  DrmHlsVideoEngineConfig,
  DrmHlsVideoEngineContext,
  DrmHlsVideoEngineSignals,
  DrmHlsVideoEngineState,
} from './engine-drm';
export { createDrmHlsVideoEngine } from './engine-drm';
