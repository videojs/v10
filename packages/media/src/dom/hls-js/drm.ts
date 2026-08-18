import Hls, { type MediaKeyFunc } from 'hls.js';

/**
 * Hardware-backed Widevine security level. Preferred (but not required) so
 * content restricted to L1 devices plays where the CDM supports it.
 */
const HARDWARE_ROBUSTNESS = 'HW_SECURE_ALL';

/**
 * Round off EME playback on a fresh engine. What to play and where to license
 * it is hls.js's own configuration, reached through `source.engine`
 * (`emeEnabled`, `drmSystems`); this only fills in what hls.js leaves to the
 * caller:
 *
 * - Prefers a hardware-backed Widevine CDM, falling back to whatever robustness
 *   the browser offers.
 * - Surfaces non-fatal key system errors in development, which are otherwise
 *   silent.
 *
 * A `requestMediaKeySystemAccessFunc` of your own takes precedence over both.
 */
export function setupDrm(engine: Hls): void {
  // hls.js only runs EME while `emeEnabled` is set, so unprotected playback is
  // left exactly as hls.js configured it.
  if (!engine.config.emeEnabled) return;

  engine.config.requestMediaKeySystemAccessFunc =
    engine.userConfig.requestMediaKeySystemAccessFunc ?? requestKeySystemAccess;

  if (__DEV__) {
    engine.on(Hls.Events.ERROR, (_event, data) => {
      // Fatal key system failures surface as media errors; non-fatal ones
      // (e.g. output restricted → black frames) are otherwise silent.
      if (data.fatal || data.type !== Hls.ErrorTypes.KEY_SYSTEM_ERROR) return;
      console.warn(`[vjs-drm] ${data.details}`, data.error);
    });
  }
}

const requestKeySystemAccess: MediaKeyFunc = (keySystem, supportedConfigurations) => {
  // Matched loosely: key systems are versioned (`com.apple.fps.1_0`) and
  // vendor-prefixed (`com.widevine.alpha.experiment`) in the wild.
  const configurations = keySystem.includes('widevine')
    ? withHardwareRobustness(supportedConfigurations)
    : supportedConfigurations;

  return navigator.requestMediaKeySystemAccess(keySystem, configurations);
};

/**
 * Duplicate the requested key system configurations with hardware-level video
 * robustness ahead of the originals. `requestMediaKeySystemAccess()` resolves
 * with the first supported entry, so this prefers a hardware CDM without
 * failing when only software security is available.
 */
function withHardwareRobustness(configurations: MediaKeySystemConfiguration[]): MediaKeySystemConfiguration[] {
  const hardware = configurations.map((configuration): MediaKeySystemConfiguration => {
    const { videoCapabilities } = configuration;
    if (!videoCapabilities) return configuration;

    return {
      ...configuration,
      videoCapabilities: videoCapabilities.map((capability) => ({ ...capability, robustness: HARDWARE_ROBUSTNESS })),
    };
  });

  return [...hardware, ...configurations];
}
