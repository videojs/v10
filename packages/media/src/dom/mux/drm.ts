import { parseJwt } from '@videojs/utils/jwt';
import type { DrmSystemsConfig } from '../../core/drm';
import { createMuxQuery, MUX_VIDEO_DOMAIN, type MuxJWT, type MuxSourceBase } from './source';

/**
 * Build the license servers a source describes, keyed by EME key system id —
 * `source.drm` as any other source would name it. Mux signs one license token
 * per playback ID and serves every system from a URL derived from it, so
 * `drm.token` is all a caller provides.
 *
 * Returns `undefined` when no license token is present, or when the token is
 * not scoped to DRM — an unsigned license request is always rejected, so there
 * is nothing useful to configure.
 *
 * Separate from `./source` because it is the one part of the Mux source an
 * engine that licenses differently — or, like SPF today, doesn't license at
 * all — has nothing to do with.
 *
 * @internal
 */
export function createMuxDrmSystems(source?: MuxSourceBase | null): DrmSystemsConfig | undefined {
  if (!source?.playbackId) return undefined;
  const { playbackId, customDomain = MUX_VIDEO_DOMAIN, drm } = source;
  const { token } = drm ?? {};

  // License tokens must carry the DRM (`d`) audience.
  if (!token || parseJwt<MuxJWT>(token)?.aud !== 'd') return undefined;

  const query = createMuxQuery({ token });
  const url = (path: string) => `https://license.${customDomain}/${path}/${playbackId}${query}`;

  // Every system is configured unconditionally: which one a browser negotiates
  // is up to its CDM, and Mux serves all three from the same token.
  return {
    'com.apple.fps': { licenseUrl: url('license/fairplay'), serverCertificateUrl: url('appcert/fairplay') },
    'com.widevine.alpha': { licenseUrl: url('license/widevine') },
    'com.microsoft.playready': { licenseUrl: url('license/playready') },
  };
}
