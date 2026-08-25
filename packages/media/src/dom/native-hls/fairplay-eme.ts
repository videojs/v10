import type { WebKitVideoElement } from '@videojs/utils/dom';

import { KeySystems } from '../../core/drm';
import {
  createDrmError,
  FAIRPLAY_CONTENT_TYPE,
  FAIRPLAY_INIT_DATA_TYPE,
  type FairPlayContext,
  type FairPlayKeySystem,
  NativeHlsDrmErrors,
  NativeHlsDrmMessages,
  requestAppCertificate,
  requestLicenseKey,
  toDrmError,
} from './fairplay';

/**
 * FairPlay negotiates against the manifest rather than a codec, holds no persistent state, and needs no device
 * identifier — the narrowest configuration Safari will grant.
 */
const FAIRPLAY_CONFIGURATION: MediaKeySystemConfiguration = {
  initDataTypes: [FAIRPLAY_INIT_DATA_TYPE],
  videoCapabilities: [{ contentType: FAIRPLAY_CONTENT_TYPE, robustness: '' }],
  distinctiveIdentifier: 'not-allowed',
  persistentState: 'not-allowed',
  sessionTypes: ['temporary'],
};

export interface FairPlayEmeOptions {
  /**
   * Called when the CDM refuses to create a session in the one situation the legacy WebKit API still serves: an AirPlay
   * receiver on an affected OS.
   */
  onUnsupported?: (() => void) | undefined;
}

/**
 * Standard EME FairPlay, driven by the media element's `encrypted` event.
 *
 * Key exchange is the documented three-step dance: negotiate access to the key system and give the CDM its application
 * certificate, open a session and let it generate an SPC, then trade that SPC for a CKC at the license server. Key
 * system access and the certificate are shared by every session on the source, so they are resolved once and reused.
 */
export function createFairPlayEme(context: FairPlayContext, options: FairPlayEmeOptions = {}): FairPlayKeySystem {
  const { media, signal, reportError } = context;
  const sessions = new Set<MediaKeySession>();

  let keys: Promise<MediaKeys> | null = null;
  let certificate: Promise<ArrayBuffer | null> | null = null;

  async function createKeys(): Promise<MediaKeys> {
    let access: MediaKeySystemAccess;

    try {
      access = await navigator.requestMediaKeySystemAccess(KeySystems.FAIRPLAY, [FAIRPLAY_CONFIGURATION]);
    } catch (cause) {
      throw toDrmError(cause, NativeHlsDrmMessages.UNSUPPORTED_KEY_SYSTEM, NativeHlsDrmErrors.UNSUPPORTED_KEY_SYSTEM);
    }

    const mediaKeys = await access.createMediaKeys();
    const appCertificate = await (certificate ??= requestAppCertificate(context));

    // A pre-provisioned CDM can go without one, so an absent certificate is
    // only a configuration choice — a rejected one is a real failure.
    if (appCertificate) {
      const accepted = await mediaKeys.setServerCertificate(appCertificate).catch(() => false);

      if (!accepted) {
        throw createDrmError(
          NativeHlsDrmMessages.SERVER_CERTIFICATE_FAILED,
          NativeHlsDrmErrors.SERVER_CERTIFICATE_FAILED
        );
      }
    }

    // The element outlives this key system, so keys the teardown has already
    // abandoned must not reach it. `close()` releases only keys it still owns,
    // and cannot un-install what lands after that check — which would leave the
    // source that replaced this one holding a CDM configured for the last one.
    if (signal.aborted) return mediaKeys;

    await media.setMediaKeys(mediaKeys);
    return mediaKeys;
  }

  async function onMessage(session: MediaKeySession, event: MediaKeyMessageEvent): Promise<void> {
    try {
      const ckc = await requestLicenseKey(context, event.message);

      if (signal.aborted) return;

      await session.update(ckc).catch((cause) => {
        throw toDrmError(cause, NativeHlsDrmMessages.UPDATE_LICENSE_FAILED, NativeHlsDrmErrors.UPDATE_LICENSE_FAILED);
      });
    } catch (cause) {
      if (signal.aborted) return;

      // Both steps raise errors that describe themselves; this only covers what
      // neither anticipated.
      reportError(toDrmError(cause, NativeHlsDrmMessages.CDM_ERROR, NativeHlsDrmErrors.CDM_ERROR));
    }
  }

  function onKeyStatusesChange(session: MediaKeySession): void {
    session.keyStatuses.forEach((status) => {
      if (status === 'internal-error') {
        reportError(createDrmError(NativeHlsDrmMessages.CDM_ERROR, NativeHlsDrmErrors.CDM_ERROR));
      } else if (status === 'output-restricted' || status === 'output-downscaled') {
        // Playback continues — often as a black frame — so this is announced
        // without failing the source.
        reportError(
          createDrmError(NativeHlsDrmMessages.OUTPUT_RESTRICTED, NativeHlsDrmErrors.OUTPUT_RESTRICTED, false)
        );
      }
    });
  }

  async function createSession(mediaKeys: MediaKeys, initDataType: string, initData: ArrayBuffer): Promise<void> {
    const session = mediaKeys.createSession();

    sessions.add(session);

    session.addEventListener('message', (event) => void onMessage(session, event as MediaKeyMessageEvent), { signal });
    session.addEventListener('keystatuseschange', () => onKeyStatusesChange(session), { signal });

    try {
      await session.generateRequest(initDataType, initData);
    } catch (cause) {
      sessions.delete(session);
      await session.close().catch(() => {});

      // Some OS versions cannot generate a request while the playback target is
      // an AirPlay receiver. Legacy WebKit FairPlay still can, so hand over
      // rather than failing the source.
      if (isAirPlayUnsupported(media, cause)) {
        options.onUnsupported?.();
        return;
      }

      throw toDrmError(cause, NativeHlsDrmMessages.GENERATE_REQUEST_FAILED, NativeHlsDrmErrors.GENERATE_REQUEST_FAILED);
    }
  }

  return {
    async request(event: MediaEncryptedEvent): Promise<void> {
      if (event.initDataType !== FAIRPLAY_INIT_DATA_TYPE) {
        if (__DEV__) {
          console.warn(`[vjs-drm] Ignoring unexpected initialization data type "${event.initDataType}".`);
        }

        return;
      }

      if (!event.initData) {
        if (__DEV__) console.warn('[vjs-drm] Ignoring an `encrypted` event carrying no initialization data.');

        return;
      }

      const mediaKeys = await (keys ??= createKeys());

      if (signal.aborted) return;

      await createSession(mediaKeys, event.initDataType, event.initData);
    },

    async close(): Promise<void> {
      const closing = [...sessions].map((session) => session.close().catch(() => {}));

      sessions.clear();

      const pending = keys;

      keys = null;
      certificate = null;

      await Promise.all(closing);

      // Only release keys still ours: a source that replaced this one may
      // already have set its own while these sessions were closing.
      const mediaKeys = await pending?.catch(() => null);

      if (mediaKeys && media.mediaKeys === mediaKeys) {
        await media.setMediaKeys(null).catch(() => {});
      }
    },
  };
}

function isAirPlayUnsupported(media: HTMLMediaElement, cause: unknown): boolean {
  return (
    cause instanceof DOMException &&
    cause.name === 'NotSupportedError' &&
    !!(media as WebKitVideoElement).webkitCurrentPlaybackTargetIsWireless
  );
}
