import { afterEach, describe, expect, it, vi } from 'vitest';

import { subscribeAmbientLang } from '../subscribe-ambient-lang';

describe('subscribeAmbientLang', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    vi.restoreAllMocks();
  });

  it('invokes callback when html lang changes', async () => {
    const spy = vi.fn();
    const off = subscribeAmbientLang(spy);
    document.documentElement.setAttribute('lang', 'de');
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
    off();
  });

  it('invokes callback when html lang property changes', async () => {
    const spy = vi.fn();
    const off = subscribeAmbientLang(spy);
    document.documentElement.lang = 'fr';
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
    off();
  });

  it('unsubscribe stops notifications', async () => {
    const spy = vi.fn();
    const off = subscribeAmbientLang(spy);
    off();
    spy.mockClear();
    document.documentElement.setAttribute('lang', 'fr');
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });
});
