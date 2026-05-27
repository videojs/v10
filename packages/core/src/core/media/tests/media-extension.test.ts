import { describe, expect, it, vi } from 'vitest';
import { defineExtension, getExtensions } from '../media-extension';
import { MediaLayer } from '../media-layer';

class MediaHost extends MediaLayer {}

describe('getExtensions().install', () => {
  it('runs install only once per host across separate instances from the same factory', () => {
    const install = vi.fn(() => vi.fn());
    const googleCast = defineExtension(() => ({ install }));
    const media = new MediaHost();

    getExtensions(media).install(googleCast());
    getExtensions(media).install(googleCast());

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('returns destroy from install', () => {
    const teardown = vi.fn();
    const googleCast = defineExtension(() => ({ install: () => teardown }));
    const media = new MediaHost();

    getExtensions(media).install(googleCast())();

    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('returns the same destroy on duplicate install', () => {
    const googleCast = defineExtension(() => ({ install: () => () => {} }));
    const media = new MediaHost();

    const first = getExtensions(media).install(googleCast());
    const second = getExtensions(media).install(googleCast());

    expect(second).toBe(first);
  });

  it('allows install again after destroy', () => {
    const install = vi.fn(() => vi.fn());
    const googleCast = defineExtension(() => ({ install }));
    const media = new MediaHost();

    getExtensions(media).install(googleCast())();
    getExtensions(media).install(googleCast());

    expect(install).toHaveBeenCalledTimes(2);
  });

  it('destroy is a no-op when called more than once', () => {
    const teardown = vi.fn();
    const googleCast = defineExtension(() => ({ install: () => teardown }));
    const media = new MediaHost();

    const destroy = getExtensions(media).install(googleCast());
    destroy();
    destroy();

    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('tracks separate extension factories independently', () => {
    const install = vi.fn(() => vi.fn());
    const googleCast = defineExtension(() => ({ install }));
    const muxData = defineExtension(() => ({ install }));
    const media = new MediaHost();

    getExtensions(media).install(googleCast());
    getExtensions(media).install(muxData());

    expect(install).toHaveBeenCalledTimes(2);
  });

  it('does not re-brand when the factory returns the same instance', () => {
    const teardown = vi.fn();
    const install = vi.fn(() => teardown);
    const singleton = { install };
    const googleCast = defineExtension(() => singleton);
    const media = new MediaHost();

    const first = googleCast();
    const second = googleCast();
    expect(second).toBe(first);

    getExtensions(media).install(first)();

    expect(install).toHaveBeenCalledTimes(1);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('tracks installs separately per host', () => {
    const install = vi.fn(() => vi.fn());
    const googleCast = defineExtension(() => ({ install }));
    const a = new MediaHost();
    const b = new MediaHost();

    getExtensions(a).install(googleCast());
    getExtensions(b).install(googleCast());

    expect(install).toHaveBeenCalledTimes(2);
  });

  it('installs an un-branded extension without dedup bookkeeping', () => {
    const teardown = vi.fn();
    const install = vi.fn(() => teardown);
    const media = new MediaHost();

    const destroy = getExtensions(media).install({ install });
    destroy();

    expect(install).toHaveBeenCalledTimes(1);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('install bookkeeping ignores mutation of the user-defined install method', () => {
    const original = vi.fn(() => () => {});
    const replacement = vi.fn(() => () => {});
    const googleCast = defineExtension(() => ({ install: original }));
    const media = new MediaHost();

    const ext = googleCast();
    ext.install = replacement;
    getExtensions(media).install(ext);

    expect(original).toHaveBeenCalledTimes(1);
    expect(replacement).not.toHaveBeenCalled();
  });

  it('passes media and an abort signal to install and aborts the signal on destroy', () => {
    let receivedMedia: MediaLayer | undefined;
    let receivedSignal: AbortSignal | undefined;
    const ext = defineExtension(() => ({
      install(media, { signal }) {
        receivedMedia = media;
        receivedSignal = signal;
      },
    }));
    const media = new MediaHost();

    const destroy = getExtensions(media).install(ext());

    expect(receivedMedia).toBe(media);
    expect(receivedSignal?.aborted).toBe(false);

    destroy();
    expect(receivedSignal?.aborted).toBe(true);
  });

  it('aborts the signal before running the user teardown', () => {
    const order: string[] = [];
    const ext = defineExtension(() => ({
      install(_media, { signal }) {
        signal.addEventListener('abort', () => order.push('signal'));
        return () => order.push('teardown');
      },
    }));
    const media = new MediaHost();

    getExtensions(media).install(ext())();

    expect(order).toEqual(['signal', 'teardown']);
  });

  it('install can rely on the signal alone and omit a teardown', () => {
    const onAbort = vi.fn();
    const ext = defineExtension(() => ({
      install(_media, { signal }) {
        signal.addEventListener('abort', onAbort);
      },
    }));
    const media = new MediaHost();

    const destroy = getExtensions(media).install(ext());
    destroy();
    destroy();

    expect(onAbort).toHaveBeenCalledTimes(1);
  });
});

describe('extension.install(media) shortcut', () => {
  it('calling extension.install(media) goes through the registry', () => {
    const install = vi.fn(() => vi.fn());
    const googleCast = defineExtension(() => ({ install }));
    const media = new MediaHost();

    googleCast().install(media);
    googleCast().install(media);

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('shares dedup state with getExtensions().install', () => {
    const install = vi.fn(() => vi.fn());
    const googleCast = defineExtension(() => ({ install }));
    const media = new MediaHost();

    googleCast().install(media);
    getExtensions(media).install(googleCast());

    expect(install).toHaveBeenCalledTimes(1);
  });

  it('returns the same destroy as the registry path', () => {
    const googleCast = defineExtension(() => ({ install: () => () => {} }));
    const media = new MediaHost();

    const first = googleCast().install(media);
    const second = getExtensions(media).install(googleCast());

    expect(second).toBe(first);
  });
});

describe('getExtensions().get', () => {
  it('returns the installed instance for a factory + media', () => {
    const googleCast = defineExtension((props: { receiverApplicationId: string }) => ({
      ...props,
      install: () => () => {},
    }));
    const media = new MediaHost();

    const cast = googleCast({ receiverApplicationId: 'abc' });
    getExtensions(media).install(cast);

    expect(getExtensions(media).get(googleCast)).toBe(cast);
  });

  it('returns the first-installed instance even when called via a later factory call', () => {
    const googleCast = defineExtension((props: { receiverApplicationId: string }) => ({
      ...props,
      install: () => () => {},
    }));
    const media = new MediaHost();

    const first = googleCast({ receiverApplicationId: 'A' });
    getExtensions(media).install(first);
    getExtensions(media).install(googleCast({ receiverApplicationId: 'B' }));

    expect(getExtensions(media).get(googleCast)).toBe(first);
  });

  it('returns undefined when nothing from the factory is installed', () => {
    const googleCast = defineExtension(() => ({ install: () => () => {} }));
    const media = new MediaHost();

    expect(getExtensions(media).get(googleCast)).toBeUndefined();
  });

  it('returns undefined for a factory not created by defineExtension', () => {
    const media = new MediaHost();
    const adhoc = () => ({ install: () => () => {} });

    expect(getExtensions(media).get(adhoc)).toBeUndefined();
  });

  it('returns undefined after the extension is destroyed', () => {
    const googleCast = defineExtension(() => ({ install: () => () => {} }));
    const media = new MediaHost();

    const destroy = getExtensions(media).install(googleCast());
    destroy();

    expect(getExtensions(media).get(googleCast)).toBeUndefined();
  });

  it('lets the caller mutate live props through the returned instance', () => {
    const googleCast = defineExtension((props: { receiverApplicationId: string }) => ({
      ...props,
      install: () => () => {},
    }));
    const media = new MediaHost();
    getExtensions(media).install(googleCast({ receiverApplicationId: 'A' }));

    const cast = getExtensions(media).get(googleCast)!;
    cast.receiverApplicationId = 'B';

    expect(getExtensions(media).get(googleCast)?.receiverApplicationId).toBe('B');
  });
});

describe('getExtensions iteration', () => {
  it('iterates installed instances in install order', () => {
    const googleCast = defineExtension(() => ({ install: () => () => {} }));
    const muxData = defineExtension(() => ({ install: () => () => {} }));
    const media = new MediaHost();

    const cast = googleCast();
    const mux = muxData();
    getExtensions(media).install(cast);
    getExtensions(media).install(mux);

    expect([...getExtensions(media)]).toEqual([cast, mux]);
  });

  it('drops destroyed extensions from the iteration', () => {
    const googleCast = defineExtension(() => ({ install: () => () => {} }));
    const muxData = defineExtension(() => ({ install: () => () => {} }));
    const media = new MediaHost();

    const cast = googleCast();
    const mux = muxData();
    const destroyCast = getExtensions(media).install(cast);
    getExtensions(media).install(mux);
    destroyCast();

    expect([...getExtensions(media)]).toEqual([mux]);
  });

  it('exposes length', () => {
    const googleCast = defineExtension(() => ({ install: () => () => {} }));
    const media = new MediaHost();

    expect(getExtensions(media).length).toBe(0);
    getExtensions(media).install(googleCast());
    expect(getExtensions(media).length).toBe(1);
  });

  it('iteration is empty for a fresh host', () => {
    expect([...getExtensions(new MediaHost())]).toEqual([]);
  });
});

describe('getExtensions().destroy', () => {
  it('tears down every installed extension', () => {
    const teardownA = vi.fn();
    const teardownB = vi.fn();
    const a = defineExtension(() => ({ install: () => teardownA }));
    const b = defineExtension(() => ({ install: () => teardownB }));
    const media = new MediaHost();

    getExtensions(media).install(a());
    getExtensions(media).install(b());
    getExtensions(media).destroy();

    expect(teardownA).toHaveBeenCalledTimes(1);
    expect(teardownB).toHaveBeenCalledTimes(1);
    expect(getExtensions(media).length).toBe(0);
  });

  it('tears down in install order', () => {
    const order: string[] = [];
    const a = defineExtension(() => ({ install: () => () => order.push('a') }));
    const b = defineExtension(() => ({ install: () => () => order.push('b') }));
    const media = new MediaHost();

    getExtensions(media).install(a());
    getExtensions(media).install(b());
    getExtensions(media).destroy();

    expect(order).toEqual(['a', 'b']);
  });

  it('aborts each extension’s signal', () => {
    const aborts: boolean[] = [];
    const ext = defineExtension(() => ({
      install(_media, { signal }) {
        signal.addEventListener('abort', () => aborts.push(true));
      },
    }));
    const media = new MediaHost();

    getExtensions(media).install(ext());
    getExtensions(media).destroy();

    expect(aborts).toEqual([true]);
  });

  it('is safe to call when nothing is installed', () => {
    expect(() => getExtensions(new MediaHost()).destroy()).not.toThrow();
  });

  it('can be called repeatedly without re-running teardowns', () => {
    const teardown = vi.fn();
    const ext = defineExtension(() => ({ install: () => teardown }));
    const media = new MediaHost();

    getExtensions(media).install(ext());
    getExtensions(media).destroy();
    getExtensions(media).destroy();

    expect(teardown).toHaveBeenCalledTimes(1);
  });
});
