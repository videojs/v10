// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { restoreWistiaGlobals } from '../server-shim';

/** Every global the shim installs. A server runtime has none of them, which is what makes this readable. */
const SHIMMED = ['window', 'location', 'screen', 'document', 'HTMLElement', 'customElements'] as const;

/**
 * Read here rather than in a test, because module scope is the only place they are still installed: the
 * shim runs on evaluation and the first `restoreWistiaGlobals()` below takes it back for good.
 */
const installed = SHIMMED.filter((name) => name in globalThis);

describe('restoreWistiaGlobals', () => {
  it('lends a server runtime every global Wistia reads while it evaluates', () => {
    expect(installed).toEqual([...SHIMMED]);
  });

  it('takes them back, so nothing after it detects a browser that is not there', () => {
    restoreWistiaGlobals();

    expect(SHIMMED.filter((name) => name in globalThis)).toEqual([]);
  });

  it('leaves a global it did not install alone, however many importers call it', () => {
    (globalThis as Record<string, unknown>).window = globalThis;

    try {
      restoreWistiaGlobals();

      expect('window' in globalThis).toBe(true);
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });
});
