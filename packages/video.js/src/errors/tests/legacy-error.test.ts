import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { getLegacyErrorUrl, LEGACY_ERROR_CODES } from '../codes';
import { formatLegacyError, isLegacyError, LegacyError, throwLegacyError } from '../legacy-error';
import { LEGACY_ERRORS, LEGACY_V8_LINE } from '../registry';

describe('formatLegacyError', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes the code, both v10 equivalents, the v8 escape hatch, and the URL in dev', () => {
    const message = formatLegacyError('VJS8_LEGACY_INIT');

    expect(message.startsWith('VJS8_LEGACY_INIT — ')).toBe(true);
    expect(message).toContain(LEGACY_ERRORS.VJS8_LEGACY_INIT.summary);
    expect(message).toContain(`HTML: ${LEGACY_ERRORS.VJS8_LEGACY_INIT.html}`);
    expect(message).toContain(`React: ${LEGACY_ERRORS.VJS8_LEGACY_INIT.react}`);
    expect(message).toContain(LEGACY_V8_LINE);
    expect(message.endsWith('→ https://videojs.org/docs/reference/api/vjs8-legacy-init')).toBe(true);
  });

  it('emits only the code and URL in production', () => {
    vi.stubGlobal('__DEV__', false);

    expect(formatLegacyError('VJS8_LEGACY_INIT')).toBe(
      'VJS8_LEGACY_INIT → https://videojs.org/docs/reference/api/vjs8-legacy-init'
    );
  });

  it('formats every registered code', () => {
    for (const code of LEGACY_ERROR_CODES) {
      const message = formatLegacyError(code);

      expect(message, code).toContain(code);
      expect(message, code).toContain(getLegacyErrorUrl(code));
    }
  });
});

describe('LegacyError', () => {
  it('carries the code, URL, and formatted message', () => {
    const error = new LegacyError('VJS8_LEGACY_PLUGIN');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('LegacyError');
    expect(error.code).toBe('VJS8_LEGACY_PLUGIN');
    expect(error.url).toBe('https://videojs.org/docs/reference/api/vjs8-legacy-plugin');
    expect(error.message).toBe(formatLegacyError('VJS8_LEGACY_PLUGIN'));
  });
});

describe('isLegacyError', () => {
  it('identifies legacy errors', () => {
    expect(isLegacyError(new LegacyError('VJS8_LEGACY_INIT'))).toBe(true);
    expect(isLegacyError(new Error('VJS8_LEGACY_INIT'))).toBe(false);
    expect(isLegacyError(null)).toBe(false);
  });
});

describe('throwLegacyError', () => {
  it('throws a LegacyError for the code', () => {
    expect(() => throwLegacyError('VJS8_LEGACY_OPTIONS')).toThrow(LegacyError);
    expect(() => throwLegacyError('VJS8_LEGACY_OPTIONS')).toThrow(/^VJS8_LEGACY_OPTIONS/);
  });
});
