import { ErrorDetails, ErrorTypes } from 'hls.js';
import { describe, expect, it } from 'vitest';

import { getErrorFromHlsErrorData, MuxErrorCategory, MuxErrorCode, MuxMediaError } from '../errors';

function makeErrorData(overrides: Record<string, unknown> = {}) {
  return {
    type: ErrorTypes.NETWORK_ERROR,
    details: ErrorDetails.MANIFEST_LOAD_ERROR,
    error: new Error('test'),
    fatal: true,
    ...overrides,
  } as any;
}

describe('MuxMediaError', () => {
  it('sets code and fatal from constructor', () => {
    const err = new MuxMediaError('bad', MuxMediaError.MEDIA_ERR_NETWORK, true);
    expect(err.code).toBe(MuxMediaError.MEDIA_ERR_NETWORK);
    expect(err.fatal).toBe(true);
  });

  it('defaults fatal based on code range', () => {
    const network = new MuxMediaError('', MuxMediaError.MEDIA_ERR_NETWORK);
    expect(network.fatal).toBe(true);
    const custom = new MuxMediaError('', 100);
    expect(custom.fatal).toBe(false);
  });

  it('stores context', () => {
    const err = new MuxMediaError('msg', MuxMediaError.MEDIA_ERR_NETWORK, true, 'ctx');
    expect(err.context).toBe('ctx');
  });
});

describe('getErrorFromHlsErrorData', () => {
  describe('network error with HTTP response', () => {
    it('maps 412 to NETWORK_NOT_READY', () => {
      const err = getErrorFromHlsErrorData(
        makeErrorData({ response: { code: 412, url: 'https://example.com', text: '' } })
      );
      expect(err.muxCode).toBe(MuxErrorCode.NETWORK_NOT_READY);
      expect(err.code).toBe(MuxMediaError.MEDIA_ERR_NETWORK);
      expect(err.errorCategory).toBe(MuxErrorCategory.VIDEO);
    });

    it('maps 404 to NETWORK_NOT_FOUND', () => {
      const err = getErrorFromHlsErrorData(makeErrorData({ response: { code: 404, url: '', text: '' } }));
      expect(err.muxCode).toBe(MuxErrorCode.NETWORK_NOT_FOUND);
    });

    it('maps 403 to NETWORK_TOKEN_MISSING (no JWT inspection yet)', () => {
      const err = getErrorFromHlsErrorData(makeErrorData({ response: { code: 403, url: '', text: '' } }));
      expect(err.muxCode).toBe(MuxErrorCode.NETWORK_TOKEN_MISSING);
    });

    it('maps 400 to NETWORK_INVALID_URL', () => {
      const err = getErrorFromHlsErrorData(makeErrorData({ response: { code: 400, url: '', text: '' } }));
      expect(err.muxCode).toBe(MuxErrorCode.NETWORK_INVALID_URL);
    });

    it('maps 500 to NETWORK_GENERIC_SERVER_FAIL', () => {
      const err = getErrorFromHlsErrorData(makeErrorData({ response: { code: 500, url: '', text: '' } }));
      expect(err.muxCode).toBe(MuxErrorCode.NETWORK_GENERIC_SERVER_FAIL);
    });
  });

  describe('DRM / key-system errors', () => {
    function makeDrmData(details: ErrorDetails, fatal = true) {
      return makeErrorData({ type: ErrorTypes.KEY_SYSTEM_ERROR, details, fatal });
    }

    it('maps NO_CONFIGURED_LICENSE to ENCRYPTED_MISSING_TOKEN', () => {
      const err = getErrorFromHlsErrorData(makeDrmData(ErrorDetails.KEY_SYSTEM_NO_CONFIGURED_LICENSE));
      expect(err.muxCode).toBe(MuxErrorCode.ENCRYPTED_MISSING_TOKEN);
      expect(err.code).toBe(MuxMediaError.MEDIA_ERR_ENCRYPTED);
      expect(err.errorCategory).toBe(MuxErrorCategory.DRM);
    });

    it('maps NO_ACCESS to ENCRYPTED_UNSUPPORTED_KEY_SYSTEM', () => {
      const err = getErrorFromHlsErrorData(makeDrmData(ErrorDetails.KEY_SYSTEM_NO_ACCESS));
      expect(err.muxCode).toBe(MuxErrorCode.ENCRYPTED_UNSUPPORTED_KEY_SYSTEM);
    });

    it('maps NO_SESSION to ENCRYPTED_GENERATE_REQUEST_FAILED (always fatal)', () => {
      const err = getErrorFromHlsErrorData(makeDrmData(ErrorDetails.KEY_SYSTEM_NO_SESSION, false));
      expect(err.muxCode).toBe(MuxErrorCode.ENCRYPTED_GENERATE_REQUEST_FAILED);
      expect(err.fatal).toBe(true);
    });

    it('maps SESSION_UPDATE_FAILED to ENCRYPTED_UPDATE_LICENSE_FAILED', () => {
      const err = getErrorFromHlsErrorData(makeDrmData(ErrorDetails.KEY_SYSTEM_SESSION_UPDATE_FAILED));
      expect(err.muxCode).toBe(MuxErrorCode.ENCRYPTED_UPDATE_LICENSE_FAILED);
    });

    it('maps STATUS_OUTPUT_RESTRICTED to ENCRYPTED_OUTPUT_RESTRICTED (non-fatal)', () => {
      const err = getErrorFromHlsErrorData(makeDrmData(ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED));
      expect(err.muxCode).toBe(MuxErrorCode.ENCRYPTED_OUTPUT_RESTRICTED);
      expect(err.fatal).toBe(false);
    });

    it('maps unknown DRM detail to generic ENCRYPTED_ERROR', () => {
      const err = getErrorFromHlsErrorData(makeDrmData(ErrorDetails.KEY_SYSTEM_STATUS_INTERNAL_ERROR));
      expect(err.errorCategory).toBe(MuxErrorCategory.DRM);
    });
  });

  describe('generic fallthrough', () => {
    it('produces MEDIA_ERR_DECODE for media errors', () => {
      const err = getErrorFromHlsErrorData(
        makeErrorData({ type: ErrorTypes.MEDIA_ERROR, details: ErrorDetails.BUFFER_STALLED_ERROR })
      );
      expect(err.code).toBe(MuxMediaError.MEDIA_ERR_DECODE);
    });

    it('preserves fatal flag', () => {
      const fatal = getErrorFromHlsErrorData(makeErrorData({ fatal: true }));
      expect(fatal.fatal).toBe(true);
      const nonFatal = getErrorFromHlsErrorData(makeErrorData({ fatal: false }));
      expect(nonFatal.fatal).toBe(false);
    });
  });
});
