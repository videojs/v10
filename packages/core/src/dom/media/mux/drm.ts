import type { HlsConfig } from 'hls.js';

const MUX_LICENSE_DOMAIN = 'mux.com';

/** Extract the playback ID from a Mux stream URL (`stream.mux.com/<id>.m3u8`). */
export function toPlaybackIdFromSrc(src: string): string | undefined {
  if (!src.startsWith('https://stream.')) return undefined;
  try {
    const [playbackId] = new URL(src).pathname.slice(1).split(/\.m3u8|\//);
    return playbackId || undefined;
  } catch {
    return undefined;
  }
}

function toLicenseUrl(playbackId: string, drmToken: string, scheme: 'fairplay' | 'widevine' | 'playready'): string {
  return `https://license.${MUX_LICENSE_DOMAIN}/license/${scheme}/${playbackId}?token=${drmToken}`;
}

function toAppCertUrl(playbackId: string, drmToken: string): string {
  return `https://license.${MUX_LICENSE_DOMAIN}/appcert/fairplay/${playbackId}?token=${drmToken}`;
}

/**
 * Builds the hls.js DRM configuration for Widevine, PlayReady, and FairPlay.
 * Requires a playback ID (to build license URLs) and a DRM token.
 */
export function getDRMConfig(playbackId: string, drmToken: string): Partial<HlsConfig> {
  return {
    emeEnabled: true,
    drmSystems: {
      'com.apple.fps': {
        licenseUrl: toLicenseUrl(playbackId, drmToken, 'fairplay'),
        serverCertificateUrl: toAppCertUrl(playbackId, drmToken),
      },
      'com.widevine.alpha': {
        licenseUrl: toLicenseUrl(playbackId, drmToken, 'widevine'),
      },
      'com.microsoft.playready': {
        licenseUrl: toLicenseUrl(playbackId, drmToken, 'playready'),
      },
    },
    // Prefer hardware-level Widevine (L1) security when available.
    requestMediaKeySystemAccessFunc: (keySystem, supportedConfigurations) => {
      if (keySystem === 'com.widevine.alpha') {
        supportedConfigurations = [
          ...supportedConfigurations.flatMap((config) => {
            if (!config.videoCapabilities) return [];
            return [
              {
                ...config,
                videoCapabilities: config.videoCapabilities.map((cap) => ({
                  ...cap,
                  robustness: 'HW_SECURE_ALL',
                })),
              },
            ];
          }),
          ...supportedConfigurations,
        ];
      }
      return navigator.requestMediaKeySystemAccess(keySystem, supportedConfigurations);
    },
  };
}
