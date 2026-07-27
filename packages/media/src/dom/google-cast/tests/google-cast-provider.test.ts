import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addComponent, type HTMLMediaTargetLike } from '../../media-host';
import { HTMLVideoElementHost } from '../../video-host';
import { GoogleCastProvider } from '../google-cast-provider';
import { GoogleCast } from '../index';
import { ensureCastFramework } from '../registry';

vi.mock('../registry', async (importOriginal) => {
  const original = await importOriginal<typeof import('../registry')>();
  return {
    ...original,
    ensureCastFramework: vi.fn(() => Promise.resolve({} as typeof cast.framework)),
  };
});

// The test environment's `video.textTracks` is not a spy-friendly EventTarget,
// so use a minimal structural target instead of a real element.
function createTarget(disableRemotePlayback = false) {
  const textTracks = new EventTarget();
  const target = Object.assign(new EventTarget(), {
    textTracks,
    disableRemotePlayback,
  }) as unknown as HTMLMediaTargetLike;
  return { target, textTracks };
}

beforeEach(() => {
  vi.mocked(ensureCastFramework).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GoogleCastProvider', () => {
  it('does not load the cast framework before a target is attached', () => {
    const provider = new GoogleCastProvider({});

    void provider.remote;

    expect(ensureCastFramework).not.toHaveBeenCalled();
  });

  it('does not load the cast framework on attach', () => {
    const provider = new GoogleCastProvider({});
    const { target } = createTarget();

    provider.attach(target);

    expect(ensureCastFramework).not.toHaveBeenCalled();
  });

  it('loads the cast framework when remote is read while attached', () => {
    const provider = new GoogleCastProvider({});
    const { target } = createTarget();

    provider.attach(target);
    void provider.remote;

    expect(ensureCastFramework).toHaveBeenCalledTimes(1);
  });

  it('does not load the cast framework when remote playback is disabled', () => {
    const provider = new GoogleCastProvider({});
    const { target } = createTarget(true);

    provider.attach(target);
    void provider.remote;

    expect(ensureCastFramework).not.toHaveBeenCalled();
  });

  it('adds and removes the text track change listener on attach/detach', () => {
    const provider = new GoogleCastProvider({});
    const { target, textTracks } = createTarget();
    const add = vi.spyOn(textTracks, 'addEventListener');
    const remove = vi.spyOn(textTracks, 'removeEventListener');

    provider.attach(target);
    expect(add).toHaveBeenCalledWith('change', expect.any(Function));

    provider.detach();
    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0]![1]);
  });

  it('removes the text track change listener on destroy', () => {
    const provider = new GoogleCastProvider({});
    const { target, textTracks } = createTarget();
    const add = vi.spyOn(textTracks, 'addEventListener');
    const remove = vi.spyOn(textTracks, 'removeEventListener');

    provider.attach(target);
    provider.destroy();

    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0]![1]);
    expect(provider.target).toBeNull();
  });
});

describe('GoogleCast', () => {
  it('loads the cast framework when the host remote is read while attached', () => {
    vi.stubGlobal('chrome', {});

    const host = new HTMLVideoElementHost();
    const { target } = createTarget();
    host.attach(target as Parameters<HTMLVideoElementHost['attach']>[0]);

    addComponent(host, new GoogleCast());
    expect(ensureCastFramework).not.toHaveBeenCalled();

    // The component's override must expose `remote` as an accessor so host
    // reads reach the provider's lazy-loading getter.
    void host.remote;

    expect(ensureCastFramework).toHaveBeenCalled();
  });

  it('does not load the cast framework when the host remote is read before attach', () => {
    vi.stubGlobal('chrome', {});

    const host = new HTMLVideoElementHost();
    addComponent(host, new GoogleCast());

    void host.remote;

    expect(ensureCastFramework).not.toHaveBeenCalled();
  });
});
