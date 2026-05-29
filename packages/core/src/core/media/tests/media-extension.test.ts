import { describe, expect, it, vi } from 'vitest';
import { getExtensions, installExtension, type MediaExtension } from '../media-extension';
import { MediaLayer } from '../media-layer';

class MediaHost extends MediaLayer {}

class TestExtension implements MediaExtension {
  static install = vi.fn<(media: MediaHost) => void>();
  static teardown = vi.fn<() => void>();

  #destroy = () => {};
  value = '';

  constructor(value = '') {
    this.value = value;
  }

  install(media: MediaHost) {
    TestExtension.install(media);
    const uninstall = installExtension(testExtension, media, this);
    this.#destroy = () => {
      uninstall();
      TestExtension.teardown();
    };
  }

  destroy() {
    this.#destroy();
    this.#destroy = () => {};
  }
}

function testExtension(value = '') {
  return new TestExtension(value);
}

class OtherExtension implements MediaExtension {
  static install = vi.fn<() => void>();
  static teardown = vi.fn<() => void>();

  #destroy = () => {};

  install(media: MediaHost) {
    OtherExtension.install();
    const uninstall = installExtension(otherExtension, media, this);
    this.#destroy = () => {
      uninstall();
      OtherExtension.teardown();
    };
  }

  destroy() {
    this.#destroy();
    this.#destroy = () => {};
  }
}

function otherExtension() {
  return new OtherExtension();
}

function resetSpies() {
  TestExtension.install.mockClear();
  TestExtension.teardown.mockClear();
  OtherExtension.install.mockClear();
  OtherExtension.teardown.mockClear();
}

describe('MediaExtension', () => {
  it('registers an installed extension by factory', () => {
    resetSpies();
    const media = new MediaHost();
    const extension = testExtension('abc');

    extension.install(media);

    expect(TestExtension.install).toHaveBeenCalledWith(media);
    expect(getExtensions(media).get(testExtension)).toBe(extension);
  });

  it('keeps registrations separate per host', () => {
    const a = new MediaHost();
    const b = new MediaHost();
    const first = testExtension('A');
    const second = testExtension('B');

    first.install(a);
    second.install(b);

    expect(getExtensions(a).get(testExtension)).toBe(first);
    expect(getExtensions(b).get(testExtension)).toBe(second);
  });

  it('returns undefined when no extension from the factory is installed', () => {
    expect(getExtensions(new MediaHost()).get(testExtension)).toBeUndefined();
  });

  it('lets the caller mutate live props through the returned instance', () => {
    const media = new MediaHost();
    testExtension('A').install(media);

    const extension = getExtensions(media).get(testExtension)!;
    extension.value = 'B';

    expect(getExtensions(media).get(testExtension)?.value).toBe('B');
  });

  it('iterates installed extensions in install order', () => {
    const media = new MediaHost();
    const a = testExtension();
    const b = otherExtension();

    a.install(media);
    b.install(media);

    expect([...getExtensions(media).values()]).toEqual([a, b]);
  });

  it('removes a registration when the extension is destroyed', () => {
    resetSpies();
    const media = new MediaHost();
    const extension = testExtension();

    extension.install(media);
    extension.destroy();

    expect(TestExtension.teardown).toHaveBeenCalledTimes(1);
    expect(getExtensions(media).get(testExtension)).toBeUndefined();
    expect(getExtensions(media).size).toBe(0);
  });

  it('does not remove a newer registration when an older instance is destroyed', () => {
    const media = new MediaHost();
    const first = testExtension('A');
    const second = testExtension('B');

    first.install(media);
    second.install(media);
    first.destroy();

    expect(getExtensions(media).get(testExtension)).toBe(second);
  });

  it('destroy is a no-op when called more than once', () => {
    resetSpies();
    const media = new MediaHost();
    const extension = testExtension();

    extension.install(media);
    extension.destroy();
    extension.destroy();

    expect(TestExtension.teardown).toHaveBeenCalledTimes(1);
  });
});
