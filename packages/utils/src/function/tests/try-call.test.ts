import { describe, expect, it, vi } from 'vite-plus/test';

import { tryCall } from '../try-call';

describe('tryCall', () => {
  it('calls the function', () => {
    const fn = vi.fn();

    tryCall(fn);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('swallows errors thrown by the function', () => {
    const fn = () => {
      throw new Error('should not propagate');
    };

    expect(() => tryCall(fn)).not.toThrow();
  });

  it('does not report swallowed errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    tryCall(() => {
      throw new Error('test error');
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
