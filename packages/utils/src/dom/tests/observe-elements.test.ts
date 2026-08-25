import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { observeElementSize, observeElements, observeRenderedSize, observeResize } from '../observe-elements';

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }
}

/** Drive one observation, carrying the content box the size observers read. */
function deliver(observer: ResizeObserverStub, width: number, height: number) {
  const entry = { contentBoxSize: [{ inlineSize: width, blockSize: height }] } as unknown as ResizeObserverEntry;

  observer.callback([entry], observer as unknown as ResizeObserver);
}

/** A `MediaQueryList` stand-in; see `device-pixel-ratio.test.ts`. */
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

class MutationObserverStub {
  static instances: MutationObserverStub[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: MutationCallback) {
    MutationObserverStub.instances.push(this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  ResizeObserverStub.instances.length = 0;
  MutationObserverStub.instances.length = 0;
});

describe('observeResize', () => {
  it('observes multiple elements and returns cleanup', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    const first = document.createElement('div');
    const second = document.createElement('div');
    const callback = vi.fn();
    const cleanup = observeResize([first, second], callback);
    const observer = ResizeObserverStub.instances[0]!;

    expect(observer.observe).toHaveBeenCalledTimes(2);
    expect(observer.observe).toHaveBeenCalledWith(first);
    expect(observer.observe).toHaveBeenCalledWith(second);

    observer.callback([], observer as unknown as ResizeObserver);
    expect(callback).toHaveBeenCalledOnce();

    cleanup();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it('does nothing when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    expect(() => observeResize(document.createElement('div'), vi.fn())()).not.toThrow();
  });
});

describe('observeElementSize', () => {
  it('reports the content box from the entry', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    const onResize = vi.fn();

    const cleanup = observeElementSize(document.createElement('div'), onResize);
    const observer = ResizeObserverStub.instances[0]!;

    deliver(observer, 320, 180);

    expect(onResize).toHaveBeenCalledWith({ width: 320, height: 180 });

    cleanup();
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it('reports nothing for a delivery carrying no entries', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    const onResize = vi.fn();

    observeElementSize(document.createElement('div'), onResize);
    const observer = ResizeObserverStub.instances[0]!;

    observer.callback([], observer as unknown as ResizeObserver);

    expect(onResize).not.toHaveBeenCalled();
  });
});

describe('observeRenderedSize', () => {
  it('reports the content box with the current device pixel ratio', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('devicePixelRatio', 2);
    const onResize = vi.fn();

    observeRenderedSize(document.createElement('div'), onResize);
    deliver(ResizeObserverStub.instances[0]!, 320, 180);

    expect(onResize).toHaveBeenCalledWith({ width: 320, height: 180, scale: 2 });
  });

  it('re-reports the last box when the ratio changes', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const onResize = vi.fn();

    observeRenderedSize(document.createElement('div'), onResize);
    deliver(ResizeObserverStub.instances[0]!, 320, 180);

    vi.stubGlobal('devicePixelRatio', 3);
    queries[0]!.dispatchEvent(new Event('change'));

    // The CSS box is unchanged; its device-pixel size is not.
    expect(onResize).toHaveBeenLastCalledWith({ width: 320, height: 180, scale: 3 });
  });

  it('reports nothing before the first box arrives', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const onResize = vi.fn();

    observeRenderedSize(document.createElement('div'), onResize);

    vi.stubGlobal('devicePixelRatio', 3);
    queries[0]!.dispatchEvent(new Event('change'));

    // A scale with no box to apply it to is not a measurement.
    expect(onResize).not.toHaveBeenCalled();
  });

  it('stops both watchers on cleanup', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('devicePixelRatio', 2);
    const queries = stubMatchMedia();
    const onResize = vi.fn();

    const cleanup = observeRenderedSize(document.createElement('div'), onResize);

    deliver(ResizeObserverStub.instances[0]!, 320, 180);
    cleanup();

    vi.stubGlobal('devicePixelRatio', 3);
    queries[0]!.dispatchEvent(new Event('change'));

    expect(ResizeObserverStub.instances[0]!.disconnect).toHaveBeenCalledOnce();
    expect(onResize).toHaveBeenLastCalledWith({ width: 320, height: 180, scale: 2 });
  });
});

describe('observeElements', () => {
  it('refreshes the observed set when the root mutates', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('MutationObserver', MutationObserverStub);
    const root = document.createElement('div');
    const first = document.createElement('div');
    const second = document.createElement('div');
    let elements = [first];
    const onChange = vi.fn();
    const cleanup = observeElements({
      root,
      getElements: () => elements,
      mutations: { childList: true },
      onChange,
    });

    expect(ResizeObserverStub.instances[0]!.observe).toHaveBeenCalledWith(first);

    elements = [second];
    MutationObserverStub.instances[0]!.callback([], MutationObserverStub.instances[0] as unknown as MutationObserver);

    expect(ResizeObserverStub.instances[0]!.disconnect).toHaveBeenCalledOnce();
    expect(ResizeObserverStub.instances[1]!.observe).toHaveBeenCalledWith(second);
    expect(onChange).toHaveBeenCalledOnce();

    cleanup();
    expect(MutationObserverStub.instances[0]!.disconnect).toHaveBeenCalledOnce();
    expect(ResizeObserverStub.instances[1]!.disconnect).toHaveBeenCalledOnce();
  });
});
