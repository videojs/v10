/**
 * The key-system modules an engine composes: one value per system, each carrying that system's whole contribution to
 * negotiation, init data, and license shaping. See {@link KeySystemModule} for the contract and why it exists.
 *
 * DOM-bound because PlayReady's license message is XML that wants a real parser. The contract itself is DOM-free, in
 * `../drm.ts`, so rendition pruning consumes modules without pulling this file's parsing in.
 */
import type { KeySystemModule } from '../drm';

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
 * Widevine. Declares itself by the DASH system-id URN, ships a complete PSSH box in its `data:` URI, and takes the raw
 * license message as octet-stream.
 *
 * `HW_SECURE_ALL` is the L1 hardware tier; Mux Player prefers it over hls.js the same way.
 */
export const widevineKeySystem: KeySystemModule = {
  keySystem: 'com.widevine.alpha',
  keyFormats: ['urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed'],
  preferredVideoRobustness: 'HW_SECURE_ALL',
  toInitData: (uri) => {
    const initData = initDataFromKeyUri(uri);

    return initData && { initDataType: 'cenc', initData };
  },
};

/** PlayReady's CENC system id, 9a04f079-9840-4286-ab92-e65be0885f95, as bytes. */
const PLAYREADY_SYSTEM_ID = Uint8Array.from([
  0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95,
]);

function isPsshBox(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[4] === 0x70 && bytes[5] === 0x73 && bytes[6] === 0x73 && bytes[7] === 0x68;
}

/**
 * Wrap a raw PlayReady Object (WRMHEADER) in a v0 PSSH box under PlayReady's system id, as hls.js and Shaka do —
 * `generateRequest('cenc', …)` refuses the bare PRO. A payload that is already a PSSH box passes through.
 */
function toPlayReadyPssh(bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  if (isPsshBox(bytes)) return bytes;

  const box = new Uint8Array(32 + bytes.length);
  const view = new DataView(box.buffer);

  view.setUint32(0, box.length);
  box.set([0x70, 0x73, 0x73, 0x68], 4); // 'pssh'; version + flags stay zeroed at offset 8
  box.set(PLAYREADY_SYSTEM_ID, 12);
  view.setUint32(28, bytes.length);
  box.set(bytes, 32);
  return box;
}

/**
 * PlayReady. The one system that differs on every axis the module contract exposes.
 *
 * The plain id comes first among the request variants. `.recommendation` selects the hardware security level, and a
 * hardware CDM refuses a license issued against a software one — a successful `200` whose `session.update()` then
 * throws. hls.js and Mux Player never request `.recommendation` at all and license Windows PlayReady successfully; the
 * plain id is what is proven. It stays as a fallback for stacks that expose only the hardware variant.
 *
 * License messages are XML-shaped: classic CDMs wrap the challenge in a UTF-16 `PlayReadyKeyMessage` envelope whose
 * `HttpHeaders` name the real request headers and whose `Challenge` is base64 — unwrap it; modern (`.recommendation`)
 * CDMs emit the challenge directly, sent as XML.
 */
export const playReadyKeySystem: KeySystemModule = {
  keySystem: 'com.microsoft.playready',
  keyFormats: ['com.microsoft.playready'],
  requestVariants: ['com.microsoft.playready', 'com.microsoft.playready.recommendation'],
  toInitData: (uri) => {
    const initData = initDataFromKeyUri(uri);

    return initData && { initDataType: 'cenc', initData: toPlayReadyPssh(initData) };
  },
  licenseRequest: (request) => {
    const text = new TextDecoder('utf-16le').decode(request.body!).replace(/^\uFEFF/, '');

    if (!text.includes('PlayReadyKeyMessage')) {
      return { ...request, headers: { ...request.headers, 'Content-Type': 'text/xml; charset=utf-8' } };
    }

    const document_ = new DOMParser().parseFromString(text, 'application/xml');
    // Derived headers win over the request's own \u2014 a classic PlayReady challenge
    // names the headers its CDM requires, and those are not negotiable.
    const headers = { ...request.headers };

    for (const header of document_.querySelectorAll('HttpHeader')) {
      const name = header.querySelector('name')?.textContent;
      const value = header.querySelector('value')?.textContent;

      if (name && value) headers[name] = value;
    }

    const binary = atob(document_.querySelector('Challenge')?.textContent ?? '');
    const body = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) body[i] = binary.charCodeAt(i);

    return { ...request, headers, body };
  },
};

/**
 * FairPlay. No `toInitData`: its `skd://` key URI carries no EME init data, so sessions come from the element's
 * `encrypted` events, where the init data arrives as `sinf` on the MSE path. Safari rejects a cenc-only configuration,
 * hence the explicit `initDataTypes`.
 */
export const fairPlayKeySystem: KeySystemModule = {
  keySystem: 'com.apple.fps',
  keyFormats: ['com.apple.streamingkeydelivery'],
  initDataTypes: ['sinf', 'cenc'],
};

/**
 * W3C Clear Key — the one key system the EME spec requires, so every Chromium ships it, including the bundled test
 * browsers that carry no proprietary CDM. That makes it the full-pipeline EME test vehicle (negotiate → attach →
 * license → decode with no Widevine/PlayReady/FairPlay available), and a legitimate choice for low-value content.
 *
 * HLS has no registered Clear Key KEYFORMAT, so this module adopts the W3C "common" PSSH system-id URN and expects the
 * key URI to carry that PSSH as a `data:` URI — the same manifest-driven shape as Widevine. The license exchange is
 * spec-fixed JSON: the CDM's message is `{"kids": […]}` and the response is a JWK set, hence the JSON content type.
 */
export const clearKeySystem: KeySystemModule = {
  keySystem: 'org.w3.clearkey',
  keyFormats: ['urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b'],
  toInitData: (uri) => {
    const initData = initDataFromKeyUri(uri);

    return initData && { initDataType: 'cenc', initData };
  },
  licenseRequest: (request) => ({
    ...request,
    headers: { ...request.headers, 'Content-Type': 'application/json' },
  }),
};

/**
 * All three systems, in hls.js's negotiation order: the platform-native system first (FairPlay exists only on Apple
 * UAs, so it costs nothing elsewhere). Clear Key stays out — a composition that wants it says so.
 *
 * The convenience default, not a requirement — an engine that only ever sees Widevine composes `[widevineKeySystem]`
 * and pays for nothing else.
 */
export const DEFAULT_KEY_SYSTEMS: readonly KeySystemModule[] = [
  fairPlayKeySystem,
  widevineKeySystem,
  playReadyKeySystem,
];
