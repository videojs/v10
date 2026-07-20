import { afterEach, describe, expect, it, vi } from 'vitest';

import { subscribeAmbientLang } from '../locale/subscribe-ambient-lang';

describe('subscribeAmbientLang', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('lang');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it('shares one observer across subscribers', () => {
    const RealObserver = globalThis.MutationObserver;
    const disconnect = vi.fn();
    const Observer = vi.fn(function (this: MutationObserver, callback: MutationCallback) {
      const observer = new RealObserver(callback);
      vi.spyOn(observer, 'disconnect').mockImplementation(disconnect);
      return observer;
    });
    vi.stubGlobal('MutationObserver', Observer);

    const offA = subscribeAmbientLang(vi.fn());
    const offB = subscribeAmbientLang(vi.fn());

    expect(Observer).toHaveBeenCalledTimes(1);

    offA();
    expect(disconnect).not.toHaveBeenCalled();

    offB();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
