import { afterEach, describe, expect, it, vi } from 'vitest';

import { observeElements, observeResize } from '../observe-elements';

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }
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
