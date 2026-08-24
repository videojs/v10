/**
 * The `source.drm`-shaped license-server contract.
 *
 * Accepts `@videojs/media`'s shape, so adapter-held configs pass through without the package dependency, and
 * additionally takes a resolver per URL for license servers only known once a source is set. Adapter packages outside
 * `@videojs/spf` build their `drm` config against this entry; the engine entries consume the same types internally.
 */

export type {
  DrmCredentials,
  DrmHeaders,
  DrmRequest,
  DrmRequestTransform,
  DrmResponseTransform,
  DrmSystemConfig,
  DrmSystemsConfig,
  DrmUrl,
  DrmValue,
} from './media/drm';
export { NO_KEY_SYSTEM, resolveDrmCredentials, resolveDrmHeaders, resolveDrmUrl } from './media/drm';
