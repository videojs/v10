/**
 * Browser EME helpers for DRM-composed engines: `MediaKeySystemAccess` negotiation, MediaKeys attachment,
 * manifest-carried init-data decoding, and the license POST. Stateless helpers — `setupMediaKeys` owns all lifecycle.
 * The DOM-free DRM model half (config contract, KEYFORMAT mapping, declared keys, candidate selection) lives in
 * `../drm.ts` and is re-exported here.
 */
import type { MaybeResolvedPresentation } from '../types';
import { buildMimeCodec } from './mse/mediasource-setup';

export {
  type DrmHeaders,
  type DrmSystemConfig,
  type DrmSystemsConfig,
  type DrmUrl,
  declaredDrmKeys,
  declaredEncryptionScheme,
  KEY_SYSTEM_BY_KEY_FORMAT,
  keySystemCandidates,
  resolveDrmHeaders,
  resolveDrmUrl,
  toCencInitData,
  unplayableEncryptedTypes,
} from '../drm';

/**
 * The unique audio/video content types across every track that declares codecs — the capability surface a
 * `MediaKeySystemConfiguration` negotiates over. Includes unresolved tracks: the multivariant already carries
 * `CODECS`.
 */
export function contentTypesFromPresentation(presentation: MaybeResolvedPresentation | undefined): {
  video: string[];
  audio: string[];
} {
  const video = new Set<string>();
  const audio = new Set<string>();

  for (const selectionSet of presentation?.selectionSets ?? []) {
    for (const switchingSet of selectionSet.switchingSets) {
      for (const track of switchingSet.tracks) {
        if (track.type !== 'video' && track.type !== 'audio') continue;

        if (!track.mimeType || !track.codecs?.length) continue;

        const bucket = track.type === 'video' ? video : audio;

        bucket.add(buildMimeCodec({ mimeType: track.mimeType, codecs: track.codecs }));
      }
    }
  }

  return { video: [...video], audio: [...audio] };
}

/**
 * Init-data types per key system. FairPlay's are its own — Safari rejects a cenc-only configuration; on the MSE path
 * its init data arrives as `sinf`.
 */
const INIT_DATA_TYPES_BY_KEY_SYSTEM: Readonly<Record<string, readonly string[]>> = {
  'com.apple.fps': ['sinf', 'cenc'],
};

/**
 * Video robustness preferred per key system, offered ahead of the CDM's default. Widevine's `HW_SECURE_ALL` is the L1
 * hardware tier; naming it as a preference means a device that has L1 negotiates it while one that doesn't still gets
 * access rather than a refusal. Mux Player does exactly this over hls.js. Audio is deliberately left at the CDM's
 * default, as it is there — no audio tier is worth a failed negotiation.
 */
const PREFERRED_VIDEO_ROBUSTNESS: Readonly<Record<string, string>> = {
  'com.widevine.alpha': 'HW_SECURE_ALL',
};

/**
 * MediaKeySystemConfigurations for one key system over the given content types, most-preferred first.
 *
 * `requestMediaKeySystemAccess` takes the whole list and picks the first entry the CDM supports, so every preference
 * here is expressed by offering an extra configuration rather than by retrying — and each one can only widen what
 * negotiation accepts.
 *
 * Two preferences compose, encryption scheme outermost:
 *
 * - **Declared encryption scheme** (see `declaredEncryptionScheme`), stamped on every capability, then dropped. CDMs that
 *   honour the member negotiate the exact scheme; CDMs that refuse it outright still negotiate instead of failing the
 *   request. Windows PlayReady is the case in hand: it decrypts cbcs content but refuses a cbcs-stamped configuration,
 *   which is why hls.js leaves the member unset altogether.
 * - **Video robustness** (see `PREFERRED_VIDEO_ROBUSTNESS`), then unset.
 *
 * Scheme is the outer preference because a mismatched scheme risks failing decode outright, whereas a lower robustness
 * tier only means weaker content protection.
 */
export function buildKeySystemConfigurations(
  keySystem: string,
  contentTypes: { video: readonly string[]; audio: readonly string[] },
  encryptionScheme?: 'cbcs' | 'cenc'
): MediaKeySystemConfiguration[] {
  const configuration = (scheme?: 'cbcs' | 'cenc', robustness?: string): MediaKeySystemConfiguration => {
    const capability = (contentType: string) => ({
      contentType,
      ...(scheme !== undefined && { encryptionScheme: scheme }),
    });
    const videoCapability = (contentType: string) => ({
      ...capability(contentType),
      ...(robustness !== undefined && { robustness }),
    });

    return {
      initDataTypes: [...(INIT_DATA_TYPES_BY_KEY_SYSTEM[keySystem] ?? ['cenc'])],
      ...(contentTypes.video.length > 0 && { videoCapabilities: contentTypes.video.map(videoCapability) }),
      ...(contentTypes.audio.length > 0 && { audioCapabilities: contentTypes.audio.map(capability) }),
    };
  };

  const schemes = encryptionScheme === undefined ? [undefined] : [encryptionScheme, undefined];
  // Only worth a second entry when there are video capabilities to carry it — otherwise the two
  // configurations would be identical.
  const preferredRobustness = PREFERRED_VIDEO_ROBUSTNESS[keySystem];
  const robustnessLevels =
    preferredRobustness !== undefined && contentTypes.video.length > 0 ? [preferredRobustness, undefined] : [undefined];

  return schemes.flatMap((scheme) => robustnessLevels.map((robustness) => configuration(scheme, robustness)));
}

/**
 * Decode the init data a key declaration carries inline. Mux (and RFC 8216bis practice) delivers Widevine PSSH /
 * PlayReady PRO as a base64 `data:` URI in the key's `URI` attribute. Non-`data:` URIs (FairPlay's `skd://`, an AES-128
 * key file) carry no EME init data — those flows are event-driven or not EME at all.
 */
export function initDataFromKeyUri(uri: string): Uint8Array<ArrayBuffer> | undefined {
  if (!uri.startsWith('data:')) return undefined;

  const comma = uri.indexOf(',');
  if (comma === -1 || !uri.slice(0, comma).endsWith(';base64')) return undefined;

  const binary = atob(uri.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

/**
 * Request-string variants per configured key system, most-preferred first. The negotiation result reports the
 * _configured_ base id, which license-server lookup and message shaping key off.
 *
 * PlayReady's plain id comes first. `.recommendation` selects the hardware security level, and a hardware CDM refuses a
 * license issued against a software one — a successful `200` whose `session.update()` then throws. hls.js and Mux
 * Player never request `.recommendation` at all and license Windows PlayReady successfully; the plain id is what is
 * proven. It stays as a fallback for stacks that expose only the hardware variant.
 */
const KEY_SYSTEM_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  'com.microsoft.playready': ['com.microsoft.playready', 'com.microsoft.playready.recommendation'],
};

/**
 * Negotiate CDM access: ask for each candidate (and each of its request-string variants) in order with a configuration
 * built for that system, first success wins. Resolves `undefined` when every candidate is refused (or none were
 * given).
 */
export async function requestKeySystemAccess(
  keySystems: readonly string[],
  contentTypes: { video: readonly string[]; audio: readonly string[] },
  encryptionScheme?: 'cbcs' | 'cenc'
): Promise<{ keySystem: string; access: MediaKeySystemAccess } | undefined> {
  for (const keySystem of keySystems) {
    const configurations = buildKeySystemConfigurations(keySystem, contentTypes, encryptionScheme);

    for (const variant of KEY_SYSTEM_VARIANTS[keySystem] ?? [keySystem]) {
      try {
        return { keySystem, access: await navigator.requestMediaKeySystemAccess(variant, configurations) };
      } catch {
        // Refused — try the next variant / candidate.
      }
    }
  }

  return undefined;
}

/**
 * Shape a CDM license message for its server. Widevine and FairPlay POST the raw bytes as octet-stream (Mux's FairPlay
 * server takes the bare SPC). PlayReady is XML-shaped: classic CDMs wrap the challenge in a UTF-16
 * `PlayReadyKeyMessage` envelope whose `HttpHeaders` name the real request headers and whose `Challenge` is base64 —
 * unwrap it; modern (`.recommendation`) CDMs emit the challenge directly, sent as XML.
 */
export function shapeLicenseRequest(
  keySystem: string,
  message: BufferSource
): { body: BufferSource; headers: Record<string, string> } {
  if (keySystem !== 'com.microsoft.playready') {
    return { body: message, headers: { 'Content-Type': 'application/octet-stream' } };
  }

  const text = new TextDecoder('utf-16le').decode(message).replace(/^\uFEFF/, '');

  if (!text.includes('PlayReadyKeyMessage')) {
    return { body: message, headers: { 'Content-Type': 'text/xml; charset=utf-8' } };
  }

  const document_ = new DOMParser().parseFromString(text, 'application/xml');
  const headers: Record<string, string> = {};

  for (const header of document_.querySelectorAll('HttpHeader')) {
    const name = header.querySelector('name')?.textContent;
    const value = header.querySelector('value')?.textContent;

    if (name && value) headers[name] = value;
  }

  const binary = atob(document_.querySelector('Challenge')?.textContent ?? '');
  const body = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) body[i] = binary.charCodeAt(i);

  return { body, headers };
}

/**
 * Fetch the DRM server (application) certificate. FairPlay needs it applied (`MediaKeys.setServerCertificate`) before
 * any license request can be generated; Widevine and PlayReady configs simply don't name one.
 */
export async function fetchServerCertificate(
  serverCertificateUrl: string,
  signal: AbortSignal
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(serverCertificateUrl, { signal });
  if (!response.ok) throw new Error(`Server certificate request failed with status ${response.status}`);

  return new Uint8Array(await response.arrayBuffer());
}

/** Attach (or with `null`, detach) MediaKeys on a media element. */
export function attachMediaKeys(mediaElement: HTMLMediaElement, mediaKeys: MediaKeys | null): Promise<void> {
  return mediaElement.setMediaKeys(mediaKeys);
}

/**
 * Exchange a CDM license message for the server's license. Every major key system POSTs the raw message bytes;
 * per-system body shaping (PlayReady challenge unwrap, FairPlay SPC forms) layers on top when those systems land.
 */
export async function fetchLicense(
  licenseUrl: string,
  message: BufferSource,
  signal: AbortSignal,
  headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' }
): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(licenseUrl, {
    method: 'POST',
    headers,
    body: message,
    signal,
  });
  if (!response.ok) throw new Error(`License request failed with status ${response.status}`);

  return new Uint8Array(await response.arrayBuffer());
}
