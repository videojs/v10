import type { Constructor, MixinReturn } from '@videojs/utils/types';
import Hls, { type DRMSystemConfiguration, type DRMSystemsConfiguration, type MediaKeyFunc } from 'hls.js';
import type { HlsEngineHost } from './types';

/** DRM systems hls.js can negotiate, named after their common brand rather than their EME key system id. */
export type DrmType = 'fairplay' | 'widevine' | 'playready';

export interface DrmSystemConfig {
  /** License (key) server URL for this DRM system. */
  licenseUrl: string;
  /**
   * Server (application) certificate URL. Required for FairPlay; Widevine and
   * PlayReady ignore it.
   */
  certificateUrl?: string | undefined;
}

/** License servers per DRM system. Configuring at least one enables EME on the hls.js engine. */
export type DrmConfig = { [Type in DrmType]?: DrmSystemConfig | undefined };

export interface HlsJsMediaDrmProps {
  /** License servers per DRM system, or `null` when playback is not DRM-protected. */
  drm: DrmConfig | null;
  /** DRM system negotiated for the current session, or `null` before a key system is selected. */
  readonly drmType: DrmType | null;
}

const DRM_TYPES = ['fairplay', 'widevine', 'playready'] as const;

const KEY_SYSTEMS = {
  fairplay: 'com.apple.fps',
  widevine: 'com.widevine.alpha',
  playready: 'com.microsoft.playready',
} as const satisfies Record<DrmType, string>;

/**
 * Hardware-backed Widevine security level. Preferred (but not required) so
 * content restricted to L1 devices plays where the CDM supports it.
 */
const HARDWARE_ROBUSTNESS = 'HW_SECURE_ALL';

/**
 * Map an EME key system id to its common name. Matches on substrings because
 * key systems are versioned (`com.apple.fps.1_0`) and vendor-prefixed
 * (`com.widevine.alpha.experiment`).
 */
export function toDrmType(keySystem: string): DrmType | undefined {
  if (keySystem.includes('fps')) return 'fairplay';
  if (keySystem.includes('playready')) return 'playready';
  if (keySystem.includes('widevine')) return 'widevine';
  return undefined;
}

/**
 * Value-based identity for a DRM config. Lets callers compare configs cheaply
 * so a new object literal holding the same license servers (e.g. an inline
 * React prop) does not force an engine reload.
 */
export function toDrmConfigKey(drm?: DrmConfig | null): string {
  if (!drm) return '';
  return DRM_TYPES.flatMap((type) => {
    const system = drm[type];
    // Mirror the engine config: systems without a license server are ignored.
    return system?.licenseUrl ? [`${type}:${system.licenseUrl}:${system.certificateUrl ?? ''}`] : [];
  }).join('|');
}

/**
 * Configures hls.js EME playback from a `DrmConfig` of license servers, and
 * reports the key system that was ultimately negotiated through `drmType`.
 *
 * - Enables `emeEnabled` and maps each configured system to its EME key system
 *   id, only when DRM is actually configured, so `source.engine` stays
 *   authoritative for unprotected playback.
 * - Prefers a hardware-backed Widevine CDM, falling back to whatever
 *   robustness the browser offers.
 * - Defers to matching options in `source.engine` (`drmSystems`,
 *   `requestMediaKeySystemAccessFunc`), which remain a full escape hatch.
 *
 * @fires drmtypechange - Fired when the negotiated DRM system changes. Read `drmType` for the new value.
 */
export function HlsJsMediaDrmMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaDrm extends (BaseClass as Constructor<HlsEngineHost>) {
    #drm: DrmConfig | null = null;
    #drmType: DrmType | null = null;
    #applied = false;

    constructor(...args: any[]) {
      super(...args);

      this.#drm = (args[0] as { drm?: DrmConfig | null } | undefined)?.drm ?? null;
      // Apply before the engine attaches media: hls.js only starts listening for
      // `encrypted` on the media element while `emeEnabled` is set.
      this.#apply();

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#apply());
      this.engine?.on(Hls.Events.MEDIA_DETACHED, () => this.#reset());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#reset());

      if (__DEV__) {
        this.engine?.on(Hls.Events.ERROR, (_event, data) => {
          // Fatal key system failures surface as media errors; non-fatal ones
          // (e.g. output restricted → black frames) are otherwise silent.
          if (data.fatal || data.type !== Hls.ErrorTypes.KEY_SYSTEM_ERROR) return;
          console.warn(`[vjs-drm] ${data.details}`, data.error);
        });
      }
    }

    get drm(): DrmConfig | null {
      return this.#drm;
    }

    set drm(value: DrmConfig | null) {
      this.#drm = value;
      this.#apply();
    }

    get drmType(): DrmType | null {
      return this.#drmType;
    }

    #requestKeySystemAccess: MediaKeyFunc = (keySystem, supportedConfigurations) => {
      const drmType = toDrmType(keySystem);

      const configurations =
        drmType === 'widevine' ? withHardwareRobustness(supportedConfigurations) : supportedConfigurations;

      return navigator.requestMediaKeySystemAccess(keySystem, configurations).then((access) => {
        this.#setDrmType(drmType ?? null);
        return access;
      });
    };

    #apply(): void {
      const { engine } = this;
      if (!engine) return;

      const drmSystems = this.#toDrmSystems();

      if (!drmSystems) {
        // Unprotected playback: leave EME alone unless we enabled it earlier, in
        // which case restore what `source.engine` asked for.
        if (this.#applied) this.#restore(engine);
        return;
      }

      this.#applied = true;
      engine.config.emeEnabled = true;
      engine.config.drmSystems = { ...drmSystems, ...engine.userConfig.drmSystems };
      engine.config.requestMediaKeySystemAccessFunc =
        engine.userConfig.requestMediaKeySystemAccessFunc ?? this.#requestKeySystemAccess;
    }

    #restore(engine: Hls): void {
      const { userConfig } = engine;
      engine.config.emeEnabled = userConfig.emeEnabled ?? Hls.DefaultConfig.emeEnabled;
      engine.config.drmSystems = userConfig.drmSystems ?? Hls.DefaultConfig.drmSystems;
      engine.config.requestMediaKeySystemAccessFunc =
        userConfig.requestMediaKeySystemAccessFunc ?? Hls.DefaultConfig.requestMediaKeySystemAccessFunc;
      this.#applied = false;
      this.#setDrmType(null);
    }

    #reset(): void {
      this.#setDrmType(null);
    }

    #setDrmType(value: DrmType | null): void {
      if (this.#drmType === value) return;
      this.#drmType = value;
      this.dispatchEvent(new Event('drmtypechange'));
    }

    #toDrmSystems(): DRMSystemsConfiguration | null {
      const drm = this.#drm;
      if (!drm) return null;

      const systems: DRMSystemsConfiguration = {};

      for (const type of DRM_TYPES) {
        const system = drm[type];
        if (!system?.licenseUrl) continue;

        if (__DEV__ && type === 'fairplay' && !system.certificateUrl) {
          console.warn('[vjs-drm] FairPlay needs a `certificateUrl` (server certificate) to request a license.');
        }

        const config: DRMSystemConfiguration = { licenseUrl: system.licenseUrl };
        if (system.certificateUrl) config.serverCertificateUrl = system.certificateUrl;
        systems[KEY_SYSTEMS[type]] = config;
      }

      return Object.keys(systems).length > 0 ? systems : null;
    }
  }

  return HlsJsMediaDrm as unknown as MixinReturn<Base, HlsJsMediaDrmProps>;
}

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
