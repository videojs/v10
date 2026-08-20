import {
  createDrmError,
  FAIRPLAY_CONTENT_TYPE,
  FAIRPLAY_LEGACY_KEY_SYSTEM,
  type FairPlayContext,
  type FairPlayKeySystem,
  NativeHlsDrmErrors,
  NativeHlsDrmMessages,
  requestAppCertificate,
  requestLicenseKey,
  toDrmError,
} from './fairplay';

/**
 * The pre-EME WebKit key API. Still shipped by Safari, undeclared in
 * `lib.dom`, and only reachable through `window.WebKitMediaKeys`.
 */
interface WebKitMediaKeySession extends EventTarget {
  readonly error: { code: number; systemCode: number } | null;
  update(response: BufferSource): void;
  close(): void;
}

interface WebKitMediaKeys {
  createSession(mimeType: string, initData: BufferSource): WebKitMediaKeySession;
}

interface WebKitMediaKeysConstructor {
  new (keySystem: string): WebKitMediaKeys;
  isTypeSupported(keySystem: string, mimeType?: string): boolean;
}

interface WebKitEncryptedMediaElement extends HTMLMediaElement {
  readonly webkitKeys: WebKitMediaKeys | null;
  webkitSetMediaKeys(keys: WebKitMediaKeys | null): void;
}

interface WebKitKeyMessageEvent extends Event {
  readonly message: ArrayBuffer;
}

/** Whether this realm still exposes the legacy WebKit key API for `media`. */
export function supportsWebKitFairPlay(media: HTMLMediaElement): boolean {
  return 'WebKitMediaKeys' in globalThis && 'webkitSetMediaKeys' in media;
}

/**
 * Legacy WebKit FairPlay, driven by `webkitneedkey`.
 *
 * This exists for one reason: on some OS versions EME cannot generate a
 * license request while the playback target is an AirPlay receiver, and the
 * pre-EME API can. It mirrors the EME flow with the older calls, and differs
 * in two ways — the application certificate is mandatory (it is packed into
 * the session's initialization data rather than handed to the CDM), and
 * `webkitSetMediaKeys` / `update` are synchronous.
 *
 * Remove this once the underlying WebKit issue is fixed.
 *
 * @see https://developer.apple.com/streaming/fps/
 */
export function createFairPlayWebKit(context: FairPlayContext): FairPlayKeySystem {
  const { media, signal, reportError } = context;
  const element = media as WebKitEncryptedMediaElement;
  const sessions = new Set<WebKitMediaKeySession>();

  let certificate: Promise<ArrayBuffer | null> | null = null;

  function setupKeys(): void {
    if (element.webkitKeys) return;

    const MediaKeysConstructor = (globalThis as { WebKitMediaKeys?: WebKitMediaKeysConstructor }).WebKitMediaKeys;
    if (!MediaKeysConstructor || !supportsWebKitFairPlay(media)) {
      throw createDrmError(NativeHlsDrmMessages.UNSUPPORTED_KEY_SYSTEM, NativeHlsDrmErrors.UNSUPPORTED_KEY_SYSTEM);
    }

    try {
      element.webkitSetMediaKeys(new MediaKeysConstructor(FAIRPLAY_LEGACY_KEY_SYSTEM));
    } catch (cause) {
      throw toDrmError(cause, NativeHlsDrmMessages.UNSUPPORTED_KEY_SYSTEM, NativeHlsDrmErrors.UNSUPPORTED_KEY_SYSTEM);
    }
  }

  async function onMessage(session: WebKitMediaKeySession, event: WebKitKeyMessageEvent): Promise<void> {
    try {
      const ckc = await requestLicenseKey(context, event.message);
      if (signal.aborted) return;
      session.update(ckc);
    } catch (cause) {
      if (signal.aborted) return;
      reportError(
        toDrmError(cause, NativeHlsDrmMessages.UPDATE_LICENSE_FAILED, NativeHlsDrmErrors.UPDATE_LICENSE_FAILED)
      );
    }
  }

  function onKeyError(session: WebKitMediaKeySession): void {
    const error = createDrmError(NativeHlsDrmMessages.CDM_ERROR, NativeHlsDrmErrors.CDM_ERROR);
    error.data = session.error;
    reportError(error);
  }

  return {
    async request(event: MediaEncryptedEvent): Promise<void> {
      if (!event.initData) {
        if (__DEV__) console.warn('[vjs-drm] Ignoring a `webkitneedkey` event carrying no initialization data.');
        return;
      }

      setupKeys();

      const appCertificate = await (certificate ??= requestAppCertificate(context));
      if (signal.aborted) return;

      // Unlike EME, the certificate is packed into the session's data rather
      // than handed to the CDM, so there is no going without one.
      if (!appCertificate) {
        throw createDrmError(NativeHlsDrmMessages.MISSING_CERTIFICATE_URL, NativeHlsDrmErrors.MISSING_CONFIGURATION);
      }

      // `webkitKeys` is set by `setupKeys()` above, or it threw.
      const session = element.webkitKeys!.createSession(
        FAIRPLAY_CONTENT_TYPE,
        packInitData(event.initData, appCertificate)
      );
      sessions.add(session);

      session.addEventListener(
        'webkitkeymessage',
        (message) => void onMessage(session, message as WebKitKeyMessageEvent),
        {
          signal,
        }
      );
      session.addEventListener('webkitkeyerror', () => onKeyError(session), { signal });
    },

    async close(): Promise<void> {
      for (const session of sessions) {
        // Throws when the session is already in a closed state.
        try {
          session.close();
        } catch {}
      }
      sessions.clear();
      certificate = null;

      try {
        element.webkitSetMediaKeys(null);
      } catch {}
    },
  };
}

/**
 * Repack `webkitneedkey` initialization data into what
 * `WebKitMediaKeys.createSession()` expects.
 *
 * In:  the raw event data — a `skd://` URI as UTF-16LE, in newer WebKit builds
 *      behind a 4-byte little-endian byte count.
 * Out: that data verbatim, then the content ID and the application
 *      certificate, each behind their own 4-byte little-endian byte count.
 */
function packInitData(initData: ArrayBuffer, certificate: ArrayBuffer): Uint8Array<ArrayBuffer> {
  const source = new Uint8Array(initData);
  const contentId = toUtf16LE(getContentId(initData));
  const appCertificate = new Uint8Array(certificate);

  const packed = new Uint8Array(source.byteLength + 4 + contentId.byteLength + 4 + appCertificate.byteLength);
  const view = new DataView(packed.buffer);
  let offset = 0;

  const append = (bytes: Uint8Array) => {
    packed.set(bytes, offset);
    offset += bytes.byteLength;
  };

  const appendWithLength = (bytes: Uint8Array) => {
    view.setUint32(offset, bytes.byteLength, true);
    offset += 4;
    append(bytes);
  };

  append(source);
  appendWithLength(contentId);
  appendWithLength(appCertificate);

  return packed;
}

/**
 * The content ID FairPlay keys the session on: everything after the scheme in
 * the `skd://` URI. Locating the scheme rather than skipping a fixed prefix
 * covers both the bare URI older WebKit sends and the length-prefixed form.
 */
function getContentId(initData: ArrayBuffer): string {
  const decoded = new TextDecoder('utf-16le').decode(initData);
  const start = decoded.indexOf('skd://');
  return start === -1 ? decoded : decoded.slice(start + 'skd://'.length);
}

function toUtf16LE(value: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(value.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < value.length; i++) {
    view.setUint16(i * 2, value.charCodeAt(i), true);
  }
  return bytes;
}
