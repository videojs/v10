import { describe, expect, it, vi } from 'vitest';
import { defineExtension, getExtensions } from '../media-extension';
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

  it('restores the previous layer when destroyed', () => {
    const host = new TestLayer();
    const defaultLayer = new TestLayer();
    addLayer(host, defaultLayer);

    const layer = new TestLayer();
    const remove = addLayer(host, layer);
    remove();

    expect(host.next).toBe(defaultLayer);
    expect(layer.next).toBeNull();
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

  it('is a no-op when destroy is called more than once', () => {
    const host = new TestLayer();
    const layer = new TestLayer();
    const remove = addLayer(host, layer);
    remove();
    remove();

    expect(host.next).toBeNull();
    expect(layer.next).toBeNull();
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

  it('clears parent pointers when a layer is removed', () => {
    const host = new TestLayer();
    const layer = new TestLayer();
    const remove = addLayer(host, layer);

    const hostListener = vi.fn();
    host.addEventListener('streamtypechange', hostListener);

    remove();
    layer.dispatchEvent(new Event('streamtypechange'));

    expect(hostListener).not.toHaveBeenCalled();
  });

  it('does not double-deliver forwarded events to layers above', () => {
    const host = new TestLayer();
    const layer = new TestLayer();
    addLayer(host, layer);

    const target = makeTarget();
    host.target = target;

    const hostListener = vi.fn();
    const layerListener = vi.fn();
    host.addEventListener('play', hostListener);
    layer.addEventListener('play', layerListener);

    target.dispatchEvent(new Event('play'));

    // Each subscriber fires exactly once — the forwarders deliver directly,
    // they don't also bubble through the chain.
    expect(hostListener).toHaveBeenCalledTimes(1);
    expect(layerListener).toHaveBeenCalledTimes(1);
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

  it('invokes the removed layer’s `set target` override with `null` on removal', () => {
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
    const layer = new ObservingLayer();
    const remove = addLayer(host, layer);

    const target = makeTarget();
    host.target = target;
    calls.length = 0;

    remove();

    expect(calls).toEqual([null]);
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
    const ext = defineExtension(() => ({ install: () => teardown }));
    const host = new TestLayer();
    getExtensions(host).install(ext());

    host.destroy();

    expect(teardown).toHaveBeenCalledTimes(1);
    expect(getExtensions(host).length).toBe(0);
  });

  it('detaches the target', () => {
    const host = new TestLayer();
    host.target = makeTarget();
    host.destroy();

    expect(host.target).toBeNull();
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
    const ext = defineExtension(() => ({
      install(host) {
        const remove = addLayer(host, new TestLayer());
        return () => {
          order.push('ext-teardown');
          remove();
        };
      },
    }));

    class ChildLayer extends MediaLayer {
      override destroy() {
        order.push('child');
        super.destroy();
      }
    }

    const host = new TestLayer();
    addLayer(host, new ChildLayer());
    getExtensions(host).install(ext());

    host.destroy();

    expect(order).toEqual(['ext-teardown', 'child']);
  });

  it('does not throw when there are no extensions or chain layers', () => {
    expect(() => new TestLayer().destroy()).not.toThrow();
  });
});
