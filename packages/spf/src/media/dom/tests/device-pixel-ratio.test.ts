import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDevicePixelRatio, watchDevicePixelRatio } from '../device-pixel-ratio';

/**
 * A `MediaQueryList` stand-in — `listen` only needs an `EventTarget`, and a real
 * one lets the test drive `change` through `dispatchEvent`. The ratio itself
 * can't be changed from a test, so `matchMedia` is stubbed to record which
 * query each arming built.
 */
class FakeMediaQueryList extends EventTarget {
  constructor(readonly media: string) {
    super();
  }
}

function stubMatchMedia(): FakeMediaQueryList[] {
  const queries: FakeMediaQueryList[] = [];
  vi.stubGlobal('matchMedia', (media: string) => {
    const query = new FakeMediaQueryList(media);
    queries.push(query);
    return query;
  });
  return queries;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getDevicePixelRatio', () => {
  it('reports the environment ratio', () => {
    vi.stubGlobal('devicePixelRatio', 3);

    expect(getDevicePixelRatio()).toBe(3);
  });

  it('falls back to 1 where the ratio is not reported', () => {
    vi.stubGlobal('devicePixelRatio', undefined);

    expect(getDevicePixelRatio()).toBe(1);
  });
});

describe('watchDevicePixelRatio', () => {
  it('arms a resolution query against the current ratio', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();

    const stop = watchDevicePixelRatio(() => {});

    expect(queries.map((query) => query.media)).toEqual(['(resolution: 2dppx)']);

    stop();
  });

  it('reports the new ratio and re-arms against it', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const onChange = vi.fn();

    const stop = watchDevicePixelRatio(onChange);

    vi.stubGlobal('devicePixelRatio', 3);
    queries[0]?.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith(3);
    expect(queries.map((query) => query.media)).toEqual(['(resolution: 2dppx)', '(resolution: 3dppx)']);

    // The superseded query is detached — a stale match can't report again.
    queries[0]?.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledTimes(1);

    stop();
  });

  it('stops reporting after cleanup', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const onChange = vi.fn();

    const stop = watchDevicePixelRatio(onChange);
    stop();

    queries[0]?.dispatchEvent(new Event('change'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('no-ops where matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(() => watchDevicePixelRatio(() => {})()).not.toThrow();
  });
});
