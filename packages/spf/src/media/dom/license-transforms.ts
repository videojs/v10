/**
 * Shipped, tree-shakable request/response transform helpers a consumer drops into `source.drm[ks]` slots — a
 * form-encoding {@link DrmRequestTransform} factory for the `spc=` FairPlay dialect, and {@link DrmResponseTransform}
 * unwrappers for providers that envelope the raw CDM license. Nothing imports them by default — a composition that
 * needs none pays for none — mirroring Shaka's library-of-named-functions model rather than an always-on auto-detect.
 */
import type { DrmRequest, DrmResponseTransform } from '../drm';

/** Decode UTF-8 bytes to text, or `undefined` when the bytes are not valid UTF-8 (i.e. already-binary payload). */
function textOrUndefined(bytes: Uint8Array<ArrayBuffer>): string | undefined {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

/** BufferSource → its bytes, without copying. */
function bufferSourceBytes(source: BufferSource): Uint8Array {
  return source instanceof ArrayBuffer
    ? new Uint8Array(source)
    : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

/** Bytes to base64 (standard alphabet). A byte-by-byte loop: an SPC runs kilobytes, past spread-argument limits. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);

  return btoa(binary);
}

/** Base64 (standard alphabet) to bytes, matching the `data:`-URI decode in `key-systems.ts`. */
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return bytes;
}

/** Options for {@link formEncodeLicenseRequest}. */
export interface FormEncodeLicenseRequestOptions {
  /**
   * Extra form fields appended after `spc` — KeyOS's per-asset `assetId`, for example. Names and values are
   * URL-encoded.
   */
  fields?: Record<string, string>;
  /**
   * URL-encode the base64 payload (the default, and what standard form decoding expects — a bare `+` decodes as a
   * space). KeyOS documents that its base64 must NOT be URL-encoded; pass `false` there.
   */
  urlEncode?: boolean;
}

/**
 * Build a {@link DrmRequestTransform} that form-encodes the CDM message — `spc=<base64>` plus any extra fields, with
 * `Content-Type: application/x-www-form-urlencoded` — the FairPlay request dialect DRMtoday, PallyCon/DoveRunner, and
 * BuyDRM KeyOS share, each parameterized a little differently, hence a factory rather than a value. Everything else on
 * the request (URL, method, other headers) passes through, and a request with no body is returned untouched. Drop the
 * result into a key system's slot:
 *
 * ```ts
 * source.drm['com.apple.fps'] = { licenseUrl, serverCertificateUrl, licenseRequest: formEncodeLicenseRequest() };
 * ```
 */
export function formEncodeLicenseRequest(
  options: FormEncodeLicenseRequestOptions = {}
): (request: DrmRequest) => DrmRequest {
  const { fields = {}, urlEncode = true } = options;

  return (request) => {
    if (request.body === null) return request;

    const base64 = bytesToBase64(bufferSourceBytes(request.body));
    const spc = urlEncode ? encodeURIComponent(base64) : base64;
    const extra = Object.entries(fields)
      .map(([name, value]) => `&${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
      .join('');

    return {
      ...request,
      headers: { ...request.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new TextEncoder().encode(`spc=${spc}${extra}`),
    };
  };
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
export const detectFairPlayCkc = ((response) => {
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
}) satisfies DrmResponseTransform;

/**
 * Unwrap a JSON-wrapped license into the raw bytes `session.update` expects — the shape castLabs DRMtoday returns for
 * Widevine by default, `{ "license": "<base64>" }`. Passes a non-JSON or non-string-`license` response through
 * untouched. Drop it into a key system's slot:
 *
 * ```ts
 * source.drm['com.widevine.alpha'] = { licenseUrl, headers, licenseResponse: unwrapJsonLicense };
 * ```
 */
export const unwrapJsonLicense = ((response) => {
  const text = textOrUndefined(response);
  if (text === undefined) return response;

  let license: unknown;

  try {
    license = (JSON.parse(text) as Record<string, unknown> | null)?.['license'];
  } catch {
    return response;
  }

  return typeof license === 'string' ? base64ToBytes(license) : response;
}) satisfies DrmResponseTransform;
