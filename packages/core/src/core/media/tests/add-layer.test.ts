import { describe, expect, it, vi } from 'vitest';
import { getExtensions, installExtension, type MediaExtension } from '../media-extension';
import { addLayer, MediaLayer } from '../media-layer';
import type { Media } from '../types';

class TestLayer extends MediaLayer {
  value: number;
  constructor(value = 0) {
    super();
    this.value = value;
  }
}

function makeTarget(): Media {
  return new EventTarget() as unknown as Media;
}

describe('addLayer', () => {
  it('pushes the layer onto the host chain', () => {
    const host = new TestLayer(0);
    const defaultLayer = new TestLayer(0);
    addLayer(host, defaultLayer);

    const layer = new TestLayer(42);
    addLayer(host, layer);

    expect(host.next).toBe(layer);
    expect(layer.next).toBe(defaultLayer);
  });

  it('pops the layer from wherever it sits in the chain', () => {
    const host = new TestLayer();
    const bottom = new TestLayer(1);
    const middle = new TestLayer(2);
    const top = new TestLayer(3);

    addLayer(host, bottom);
    const removeMiddle = addLayer(host, middle);
    addLayer(host, top);

    removeMiddle();

    expect(host.next).toBe(top);
    expect(top.next).toBe(bottom);
    expect(middle.next).toBeNull();
  });

  it('bubbles layer-originated events up to the host', () => {
    const host = new TestLayer();
    const middle = new TestLayer();
    const bottom = new TestLayer();
    addLayer(host, middle);
    addLayer(host, bottom);

    const hostListener = vi.fn();
    host.addEventListener('streamtypechange', hostListener);

    bottom.dispatchEvent(new Event('streamtypechange'));

    expect(hostListener).toHaveBeenCalledTimes(1);
  });

  it('migrates every layer’s forwarders when the chain target changes', () => {
    const host = new TestLayer();
    const middle = new TestLayer();
    addLayer(host, middle);

    const first = makeTarget();
    const second = makeTarget();
    host.target = first;

    const hostListener = vi.fn();
    const middleListener = vi.fn();
    host.addEventListener('play', hostListener);
    middle.addEventListener('play', middleListener);

    host.target = second;

    // Old target must not fire forwarded events anymore — no leak.
    first.dispatchEvent(new Event('play'));
    expect(hostListener).not.toHaveBeenCalled();
    expect(middleListener).not.toHaveBeenCalled();

    // New target fires for every layer that had listeners.
    second.dispatchEvent(new Event('play'));
    expect(hostListener).toHaveBeenCalledTimes(1);
    expect(middleListener).toHaveBeenCalledTimes(1);
  });

  it('invokes a child layer’s `set target` override when the host target changes', () => {
    const calls: (Media | null)[] = [];
    class ObservingLayer extends MediaLayer {
      override set target(target: Media | null) {
        calls.push(target);
        super.target = target;
      }
      override get target() {
        return super.target;
      }
    }

    const host = new TestLayer();
    addLayer(host, new ObservingLayer());

    const first = makeTarget();
    const second = makeTarget();
    host.target = first;
    host.target = second;
    host.target = null;

    expect(calls).toEqual([first, second, null]);
  });

  it('syncs a newly added layer to the chain’s current target', () => {
    const calls: (Media | null)[] = [];
    class ObservingLayer extends MediaLayer {
      override set target(target: Media | null) {
        calls.push(target);
        super.target = target;
      }
      override get target() {
        return super.target;
      }
    }

    const host = new TestLayer();
    const target = makeTarget();
    host.target = target;

    addLayer(host, new ObservingLayer());

    expect(calls).toEqual([target]);
  });
});

describe('MediaLayer.destroy', () => {
  it('tears down installed extensions', () => {
    const teardown = vi.fn();
    class TestExtension implements MediaExtension {
      #destroy = () => {};

      install(host: TestLayer) {
        const uninstall = installExtension(testExtension, host, this);
        this.#destroy = () => {
          uninstall();
          teardown();
        };
      }

      destroy() {
        this.#destroy();
        this.#destroy = () => {};
      }
    }
    function testExtension() {
      return new TestExtension();
    }
    const host = new TestLayer();
    testExtension().install(host);

    host.destroy();

    expect(teardown).toHaveBeenCalledTimes(1);
    expect(getExtensions(host).size).toBe(0);
  });

  it('recursively destroys layers added via addLayer', () => {
    const childDestroy = vi.fn();
    class ChildLayer extends MediaLayer {
      override destroy() {
        childDestroy();
        super.destroy();
      }
    }

    const host = new TestLayer();
    addLayer(host, new ChildLayer());
    host.destroy();

    expect(childDestroy).toHaveBeenCalledTimes(1);
  });

  it('destroys nested chains in order: extensions → manually added layers', () => {
    const order: string[] = [];
    class TestExtension implements MediaExtension {
      #destroy = () => {};

      install(host: TestLayer) {
        const uninstall = installExtension(testExtension, host, this);
        const remove = addLayer(host, new TestLayer());
        this.#destroy = () => {
          uninstall();
          order.push('ext-teardown');
          remove();
        };
      }

      destroy() {
        this.#destroy();
        this.#destroy = () => {};
      }
    }
    function testExtension() {
      return new TestExtension();
    }

    class ChildLayer extends MediaLayer {
      override destroy() {
        order.push('child');
        super.destroy();
      }
    }

    const host = new TestLayer();
    addLayer(host, new ChildLayer());
    testExtension().install(host);

    host.destroy();

    expect(order).toEqual(['ext-teardown', 'child']);
  });
});
