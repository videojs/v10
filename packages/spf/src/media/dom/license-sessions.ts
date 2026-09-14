/**
 * MediaKeySession lifecycle for DRM-composed engines: open a session against attached MediaKeys, exchange its license
 * with the configured server as the CDM asks, observe its key statuses, and close it when its lifetime ends.
 *
 * Everything here binds to one `AbortSignal` — the caller's lifetime — and reports through a callback, so it reads no
 * signals and imports nothing from the behavior layer; `exchangeLicenses` decides which sessions to open and when. Kept
 * apart from `eme.ts`, which is stateless: a session carries state (its listeners, its last-seen key statuses) for as
 * long as it lives.
 */
import { listen } from '@videojs/utils/dom';

import { type DrmSystemConfig, type KeySystemModule, resolveDrmCredentials, resolveDrmHeaders } from '../drm';
import {
  SVTA_BAD_LICENSE_REQUEST,
  SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED,
  SVTA_DRM_LICENSE_RESPONSE_REJECTED,
  SVTA_DRM_SESSION_ERROR,
  SVTA_INSUFFICIENT_OUTPUT_PROTECTION,
  SVTA_LICENSE_EXPIRED,
  type SvtaError,
} from '../errors';
import { applyLicenseRequest, applyLicenseResponse, fetchDrm } from './eme';

/** Where a session reports the conditions it meets; the behavior routes these onto the errors sequence. */
export type ReportDrmCondition = (error: SvtaError) => void;

/**
 * Key statuses reported as diagnosable causes, on the SVTA codes matching each status. Only statuses that stop playback
 * report: `output-downscaled` still plays, `released` is lifecycle-normal, `usable-in-future` may resolve on its own.
 * Report-only — exclusion or renewal policy on these transitions is a downstream decision.
 */
const REPORTABLE_KEY_STATUS_CODES: Partial<Record<MediaKeyStatus, number>> = {
  expired: SVTA_LICENSE_EXPIRED,
  'output-restricted': SVTA_INSUFFICIENT_OUTPUT_PROTECTION,
  'internal-error': SVTA_DRM_SESSION_ERROR,
};

/** A key id as lowercase hex, so the reported `data` names which key failed. */
function keyIdHex(keyId: BufferSource): string {
  const bytes =
    keyId instanceof ArrayBuffer
      ? new Uint8Array(keyId)
      : new Uint8Array(keyId.buffer, keyId.byteOffset, keyId.byteLength);

  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * POST one license request and return the raw license. Two layers, module first: the module default shapes the wire
 * protocol (PlayReady's envelope unwrap, the octet-stream default) over the configured headers and credentials, then
 * the per-source override decorates the result — an auth header, a minted token — without re-implementing that shaping.
 * Rejects on any failure, shaping included, for the caller to report as a bad license request.
 */
export async function fetchLicense(
  module_: KeySystemModule | undefined,
  entry: DrmSystemConfig,
  licenseUrl: string,
  message: BufferSource,
  signal: AbortSignal
): Promise<Uint8Array<ArrayBuffer>> {
  const shaped = await applyLicenseRequest(module_, {
    url: licenseUrl,
    method: 'POST',
    headers: { ...resolveDrmHeaders(entry.headers) },
    body: message,
    credentials: resolveDrmCredentials(entry.credentials),
  });
  const request = entry.licenseRequest ? await entry.licenseRequest(shaped) : shaped;

  return fetchDrm(request, signal);
}

/**
 * Unwrap a raw license for the CDM, in the same order as the way out: the module default unwraps its protocol, then the
 * per-source override unwraps any deployment envelope. Rejects for the caller to report as a rejected response.
 */
export async function unwrapLicense(
  module_: KeySystemModule | undefined,
  entry: DrmSystemConfig,
  license: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const unwrapped = await applyLicenseResponse(module_, license);

  return entry.licenseResponse ? await entry.licenseResponse(unwrapped) : unwrapped;
}

/**
 * Observe a session's key statuses after licensing, report-only. A key turning expired / output-restricted /
 * internal-error otherwise presents as a black frame or stall with an empty errors sequence (HDCP downgrade,
 * long-session expiry). Tracked per key id because the CDM re-fires `keystatuschange` for unrelated reasons: an
 * unchanged status is not a new observation, while recovery then re-failure is.
 */
export function observeKeyStatuses(
  session: MediaKeySession,
  keySystem: string,
  report: ReportDrmCondition,
  signal: AbortSignal
): void {
  const lastStatuses = new Map<string, MediaKeyStatus>();

  listen(
    session,
    'keystatuschange',
    () => {
      session.keyStatuses.forEach((status, rawKeyId) => {
        const keyId = keyIdHex(rawKeyId);
        const previous = lastStatuses.get(keyId);

        lastStatuses.set(keyId, status);

        const code = REPORTABLE_KEY_STATUS_CODES[status];
        if (status === previous || code === undefined) return;

        report({ code, data: { keySystem, status, keyId } });
      });
    },
    { signal }
  );
}

/**
 * Open one MediaKeySession for `initData` and drive it for its lifetime: exchange its license on every `message` the
 * CDM raises (4004 when the request fails, 4016 when the CDM rejects the response), observe its key statuses, and
 * generate the initial request (4021 when the CDM cannot). The session closes when `signal` aborts — the abort first
 * kills in-flight fetches and these listeners, then the close — so the caller holds no session list of its own.
 */
export function openLicenseSession({
  mediaKeys,
  keySystem,
  module: module_,
  entry,
  licenseUrl,
  initDataType,
  initData,
  signal,
  report,
}: {
  mediaKeys: MediaKeys;
  keySystem: string;
  module: KeySystemModule | undefined;
  entry: DrmSystemConfig;
  licenseUrl: string;
  initDataType: string;
  initData: Uint8Array<ArrayBuffer>;
  signal: AbortSignal;
  report: ReportDrmCondition;
}): MediaKeySession {
  const session = mediaKeys.createSession();

  const exchange = async (message: BufferSource) => {
    let license: Uint8Array<ArrayBuffer>;

    try {
      license = await fetchLicense(module_, entry, licenseUrl, message, signal);
    } catch (error) {
      if (signal.aborted) return;

      report({ code: SVTA_BAD_LICENSE_REQUEST, data: { keySystem, reason: String(error) } });
      return;
    }

    // The fetch rejects on abort in practice; the check is the commit point
    // for a response that landed as the abort did.
    if (signal.aborted) return;

    try {
      await session.update(await unwrapLicense(module_, entry, license));
    } catch (error) {
      if (signal.aborted) return;

      report({ code: SVTA_DRM_LICENSE_RESPONSE_REJECTED, data: { keySystem, reason: String(error) } });
    }
  };

  listen(session, 'message', (event) => void exchange((event as MediaKeyMessageEvent).message), { signal });
  observeKeyStatuses(session, keySystem, report, signal);
  signal.addEventListener(
    'abort',
    () => {
      session.close().catch(() => {});
    },
    { once: true }
  );

  session.generateRequest(initDataType, initData).catch((error) => {
    if (signal.aborted) return;

    report({ code: SVTA_DRM_LICENSE_REQUEST_GENERATION_FAILED, data: { keySystem, reason: String(error) } });
  });

  return session;
}

/**
 * The event-driven path for keys without inline init data (FairPlay `skd://`): protection surfaces only once an
 * appended init segment fires `encrypted` (`sinf` on the MSE path). Deduped by init-data bytes, because demuxed audio
 * and video both fire for the same key. Listens until `signal` aborts.
 */
export function listenForEncryptedInitData(
  mediaElement: HTMLMediaElement,
  onInitData: (initDataType: string, initData: Uint8Array<ArrayBuffer>) => void,
  signal: AbortSignal
): void {
  const seen: Uint8Array[] = [];

  listen(
    mediaElement,
    'encrypted',
    (event) => {
      const { initDataType, initData } = event as MediaEncryptedEvent;
      if (!initData) return;

      const bytes = new Uint8Array(initData);
      if (seen.some((prior) => prior.length === bytes.length && prior.every((byte, i) => byte === bytes[i]))) return;

      seen.push(bytes);
      onInitData(initDataType, bytes);
    },
    { signal }
  );
}
