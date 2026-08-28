/**
 * Shipped, tree-shakable {@link DrmResponseTransform} helpers a consumer drops into a `source.drm[ks].licenseResponse`
 * slot when a provider wraps the raw CDM license. Nothing imports them by default — a composition that needs neither
 * pays for neither — mirroring Shaka's library-of-named-functions model rather than an always-on auto-detect.
 */
import type { DrmResponseTransform } from '../drm';

/** Decode UTF-8 bytes to text, or `undefined` when the bytes are not valid UTF-8 (i.e. already-binary payload). */
function textOrUndefined(bytes: Uint8Array<ArrayBuffer>): string | undefined {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

/** Base64 (standard alphabet) to bytes, matching the `data:`-URI decode in `key-systems.ts`. */
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

/**
 * Unwrap a FairPlay CKC that a license server returned wrapped, into the raw bytes `session.update` expects. Handles
 * the three wrapped shapes the field has converged on — an XML `<ckc>base64</ckc>` envelope and a JSON object keyed by
 * `ckc`, `CkcMessage`, or `License`, each carrying base64 — and passes anything else through untouched, so a server
 * that already returns the raw binary CKC (Mux, EZDRM) is unaffected.
 *
 * Faithful to Shaka's `commonFairPlayResponse` (`lib/drm/fairplay.js`): a response is only base64-decoded when a
 * wrapper is recognised; a bare payload is left alone. Drop it into a key system's slot:
 *
 * ```ts
 * source.drm['com.apple.fps'] = { licenseUrl, serverCertificateUrl, licenseResponse: detectFairPlayCkc };
 * ```
 */
export const detectFairPlayCkc: DrmResponseTransform = (response) => {
  const text = textOrUndefined(response)?.trim();
  if (text === undefined) return response;

  let payload: unknown;

  if (text.startsWith('<ckc>') && text.endsWith('</ckc>')) {
    payload = text.slice(5, -6);
  } else {
    try {
      const wrapper = JSON.parse(text) as Record<string, unknown> | null;

      payload = wrapper?.['ckc'] ?? wrapper?.['CkcMessage'] ?? wrapper?.['License'];
    } catch {
      // Not JSON — a bare payload; leave it untouched below.
    }
  }

  return typeof payload === 'string' ? base64ToBytes(payload) : response;
};

/**
 * Unwrap a JSON-wrapped license into the raw bytes `session.update` expects — the shape castLabs DRMtoday returns for
 * Widevine by default, `{ "license": "<base64>" }`. Passes a non-JSON or non-string-`license` response through
 * untouched. Drop it into a key system's slot:
 *
 * ```ts
 * source.drm['com.widevine.alpha'] = { licenseUrl, headers, licenseResponse: unwrapJsonLicense };
 * ```
 */
export const unwrapJsonLicense: DrmResponseTransform = (response) => {
  const text = textOrUndefined(response);
  if (text === undefined) return response;

  let license: unknown;

  try {
    license = (JSON.parse(text) as Record<string, unknown> | null)?.['license'];
  } catch {
    return response;
  }

  return typeof license === 'string' ? base64ToBytes(license) : response;
};
