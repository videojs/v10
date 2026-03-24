import type { ErrorData } from 'hls.js';
import Hls from 'hls.js';

export const MuxErrorCategory = {
  VIDEO: 'video',
  DRM: 'drm',
} as const;

export type MuxErrorCategoryValue = (typeof MuxErrorCategory)[keyof typeof MuxErrorCategory];

export const MuxErrorCode = {
  NOT_AN_ERROR: 0,
  NETWORK_OFFLINE: 2000002,
  NETWORK_UNKNOWN_ERROR: 2000000,
  NETWORK_NO_STATUS: 2000001,
  NETWORK_INVALID_URL: 2400000,
  NETWORK_NOT_FOUND: 2404000,
  NETWORK_NOT_READY: 2412000,
  NETWORK_GENERIC_SERVER_FAIL: 2500000,
  NETWORK_TOKEN_MISSING: 2403201,
  NETWORK_TOKEN_MALFORMED: 2412202,
  NETWORK_TOKEN_EXPIRED: 2403210,
  NETWORK_TOKEN_AUD_MISSING: 2403221,
  NETWORK_TOKEN_AUD_MISMATCH: 2403222,
  NETWORK_TOKEN_SUB_MISMATCH: 2403232,
  ENCRYPTED_ERROR: 5000000,
  ENCRYPTED_UNSUPPORTED_KEY_SYSTEM: 5000001,
  ENCRYPTED_GENERATE_REQUEST_FAILED: 5000002,
  ENCRYPTED_UPDATE_LICENSE_FAILED: 5000003,
  ENCRYPTED_UPDATE_SERVER_CERT_FAILED: 5000004,
  ENCRYPTED_CDM_ERROR: 5000005,
  ENCRYPTED_OUTPUT_RESTRICTED: 5000006,
  ENCRYPTED_MISSING_TOKEN: 5000002,
} as const;

export type MuxErrorCodeValue = (typeof MuxErrorCode)[keyof typeof MuxErrorCode];

export class MuxMediaError extends Error {
  static readonly MEDIA_ERR_ABORTED = 1;
  static readonly MEDIA_ERR_NETWORK = 2;
  static readonly MEDIA_ERR_DECODE = 3;
  static readonly MEDIA_ERR_SRC_NOT_SUPPORTED = 4;
  static readonly MEDIA_ERR_ENCRYPTED = 5;

  readonly code: number;
  readonly fatal: boolean;
  muxCode?: MuxErrorCodeValue;
  errorCategory?: MuxErrorCategoryValue;
  context?: string;
  data?: unknown;

  constructor(message: string, code = MuxMediaError.MEDIA_ERR_NETWORK, fatal?: boolean, context?: string) {
    super(message);
    this.name = 'MuxMediaError';
    this.code = code;
    this.fatal = fatal ?? (code >= MuxMediaError.MEDIA_ERR_NETWORK && code <= MuxMediaError.MEDIA_ERR_ENCRYPTED);
    if (context !== undefined) this.context = context;
  }
}

// Maps a numeric HTTP status code to a MuxErrorCode without JWT inspection.
// Full JWT-aware classification is added in Phase 6 when playbackId is available.
function getMuxCodeFromStatus(status: number): MuxErrorCodeValue {
  if (status === 412) return MuxErrorCode.NETWORK_NOT_READY;
  if (status === 404) return MuxErrorCode.NETWORK_NOT_FOUND;
  if (status === 403) return MuxErrorCode.NETWORK_TOKEN_MISSING;
  if (status === 400) return MuxErrorCode.NETWORK_INVALID_URL;
  if (status >= 500) return MuxErrorCode.NETWORK_GENERIC_SERVER_FAIL;
  if (!status) return MuxErrorCode.NETWORK_NO_STATUS;
  return MuxErrorCode.NETWORK_UNKNOWN_ERROR;
}

export function getErrorFromHlsErrorData(data: ErrorData): MuxMediaError {
  const { ErrorTypes, ErrorDetails } = Hls;

  const hlsCodeToMediaErrCode = (): number => {
    // Some DRM license/cert failures come through as network errors in hls.js.
    if (
      data.details === ErrorDetails.KEY_SYSTEM_LICENSE_REQUEST_FAILED ||
      data.details === ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED
    ) {
      return MuxMediaError.MEDIA_ERR_NETWORK;
    }
    if (data.type === ErrorTypes.NETWORK_ERROR) return MuxMediaError.MEDIA_ERR_NETWORK;
    if (data.type === ErrorTypes.MEDIA_ERROR) return MuxMediaError.MEDIA_ERR_DECODE;
    if (data.type === ErrorTypes.KEY_SYSTEM_ERROR) return MuxMediaError.MEDIA_ERR_ENCRYPTED;
    return MuxMediaError.MEDIA_ERR_NETWORK;
  };

  const code = hlsCodeToMediaErrCode();
  const context = buildContext(data);

  // ── Network errors with an HTTP response ──────────────────────────────────
  if (code === MuxMediaError.MEDIA_ERR_NETWORK && data.response) {
    const status = data.response.code ?? 0;
    const err = new MuxMediaError('', code, data.fatal, context);
    err.muxCode = getMuxCodeFromStatus(status);
    err.errorCategory = MuxErrorCategory.VIDEO;
    err.data = data;
    return err;
  }

  // ── DRM / key-system errors ───────────────────────────────────────────────
  if (code === MuxMediaError.MEDIA_ERR_ENCRYPTED) {
    const err = buildDrmError(data, context);
    err.data = data;
    return err;
  }

  // ── Generic fallthrough ───────────────────────────────────────────────────
  const err = new MuxMediaError(data.error?.message ?? '', code, data.fatal, context);
  err.data = data;
  return err;
}

function buildDrmError(data: ErrorData, context: string): MuxMediaError {
  const { ErrorDetails } = Hls;
  const code = MuxMediaError.MEDIA_ERR_ENCRYPTED;

  if (data.details === ErrorDetails.KEY_SYSTEM_NO_CONFIGURED_LICENSE) {
    const err = new MuxMediaError(
      'Attempting to play DRM-protected content without providing a DRM token.',
      code,
      data.fatal,
      context
    );
    err.errorCategory = MuxErrorCategory.DRM;
    err.muxCode = MuxErrorCode.ENCRYPTED_MISSING_TOKEN;
    return err;
  }

  if (data.details === ErrorDetails.KEY_SYSTEM_NO_ACCESS) {
    const err = new MuxMediaError(
      'Cannot play DRM-protected content with current security configuration. Try another browser.',
      code,
      data.fatal,
      context
    );
    err.errorCategory = MuxErrorCategory.DRM;
    err.muxCode = MuxErrorCode.ENCRYPTED_UNSUPPORTED_KEY_SYSTEM;
    return err;
  }

  if (data.details === ErrorDetails.KEY_SYSTEM_NO_SESSION) {
    const err = new MuxMediaError(
      'Failed to generate a DRM license request.',
      code,
      true, // always fatal even though hls.js says non-fatal
      context
    );
    err.errorCategory = MuxErrorCategory.DRM;
    err.muxCode = MuxErrorCode.ENCRYPTED_GENERATE_REQUEST_FAILED;
    return err;
  }

  if (data.details === ErrorDetails.KEY_SYSTEM_SESSION_UPDATE_FAILED) {
    const err = new MuxMediaError('Failed to update DRM license.', code, data.fatal, context);
    err.errorCategory = MuxErrorCategory.DRM;
    err.muxCode = MuxErrorCode.ENCRYPTED_UPDATE_LICENSE_FAILED;
    return err;
  }

  if (data.details === ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED) {
    const err = new MuxMediaError('Failed to set server certificate.', code, data.fatal, context);
    err.errorCategory = MuxErrorCategory.DRM;
    err.muxCode = MuxErrorCode.ENCRYPTED_UPDATE_SERVER_CERT_FAILED;
    return err;
  }

  if (data.details === ErrorDetails.KEY_SYSTEM_STATUS_INTERNAL_ERROR) {
    const err = new MuxMediaError('The DRM CDM had an internal failure.', code, data.fatal, context);
    err.errorCategory = MuxErrorCategory.DRM;
    err.muxCode = MuxErrorCode.ENCRYPTED_CDM_ERROR;
    return err;
  }

  if (data.details === ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED) {
    const err = new MuxMediaError('DRM playback is restricted in this environment.', code, false, context);
    err.errorCategory = MuxErrorCategory.DRM;
    err.muxCode = MuxErrorCode.ENCRYPTED_OUTPUT_RESTRICTED;
    return err;
  }

  const err = new MuxMediaError(data.error?.message ?? '', code, data.fatal, context);
  err.errorCategory = MuxErrorCategory.DRM;
  err.muxCode = MuxErrorCode.ENCRYPTED_ERROR;
  return err;
}

function buildContext(data: ErrorData): string {
  return [
    data.url ? `url: ${data.url}` : '',
    data.response ? `response: ${data.response.code}, ${data.response.text}` : '',
    data.reason ? `failure reason: ${data.reason}` : '',
    data.error ? `error: ${data.error}` : '',
    data.err?.message ? `error message: ${data.err.message}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
