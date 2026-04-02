import { describe, expect, it, vi } from 'vitest';

import { ProxyMixin } from '../proxy';

const MediaProxy = ProxyMixin(EventTarget);

function setup() {
  const proxy = new MediaProxy();
  const target = new EventTarget();
  proxy.attach(target);
  return { proxy, target };
}

describe('ProxyMixin', () => {
  describe('event proxying', () => {
    it('forwards events from target to proxy listeners', () => {
      const { proxy, target } = setup();
      const handler = vi.fn();

      proxy.addEventListener('play', handler);
      target.dispatchEvent(new Event('play'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not forward after removeEventListener', () => {
      const { proxy, target } = setup();
      const handler = vi.fn();

      proxy.addEventListener('play', handler);
      proxy.removeEventListener('play', handler);
      target.dispatchEvent(new Event('play'));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('multiple listeners for the same event type', () => {
    it('keeps forwarding to remaining listeners after one is removed', () => {
      const { proxy, target } = setup();
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      proxy.addEventListener('play', handlerA);
      proxy.addEventListener('play', handlerB);
      proxy.removeEventListener('play', handlerA);

      target.dispatchEvent(new Event('play'));

      expect(handlerA).not.toHaveBeenCalled();
      expect(handlerB).toHaveBeenCalledOnce();
    });

    it('removes target listener only when all listeners for a type are removed', () => {
      const { proxy, target } = setup();
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      proxy.addEventListener('play', handlerA);
      proxy.addEventListener('play', handlerB);
      proxy.removeEventListener('play', handlerA);
      proxy.removeEventListener('play', handlerB);

      target.dispatchEvent(new Event('play'));

      expect(handlerA).not.toHaveBeenCalled();
      expect(handlerB).not.toHaveBeenCalled();
    });

    it('handles interleaved add/remove across multiple types', () => {
      const { proxy, target } = setup();
      const playHandler = vi.fn();
      const pauseHandler = vi.fn();

      proxy.addEventListener('play', playHandler);
      proxy.addEventListener('pause', pauseHandler);
      proxy.removeEventListener('play', playHandler);

      target.dispatchEvent(new Event('play'));
      target.dispatchEvent(new Event('pause'));

      expect(playHandler).not.toHaveBeenCalled();
      expect(pauseHandler).toHaveBeenCalledOnce();
    });
  });

  describe('once listeners', () => {
    it('invokes a once listener exactly once', () => {
      const { proxy, target } = setup();
      const handler = vi.fn();

      proxy.addEventListener('play', handler, { once: true });
      target.dispatchEvent(new Event('play'));
      target.dispatchEvent(new Event('play'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not break other listeners when a once listener fires', () => {
      const { proxy, target } = setup();
      const onceHandler = vi.fn();
      const persistentHandler = vi.fn();

      proxy.addEventListener('play', onceHandler, { once: true });
      proxy.addEventListener('play', persistentHandler);

      target.dispatchEvent(new Event('play'));
      target.dispatchEvent(new Event('play'));

      expect(onceHandler).toHaveBeenCalledOnce();
      expect(persistentHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('attach / detach with existing listeners', () => {
    it('re-subscribes existing types on the new target after attach', () => {
      const proxy = new MediaProxy();
      const handler = vi.fn();

      proxy.addEventListener('play', handler);

      const target = new EventTarget();
      proxy.attach(target);

      target.dispatchEvent(new Event('play'));
      expect(handler).toHaveBeenCalledOnce();
    });

    it('unsubscribes all types from old target on detach', () => {
      const { proxy, target } = setup();
      const handler = vi.fn();

      proxy.addEventListener('play', handler);
      proxy.detach();

      target.dispatchEvent(new Event('play'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('transfers listeners when switching targets', () => {
      const { proxy, target: oldTarget } = setup();
      const handler = vi.fn();

      proxy.addEventListener('play', handler);
      proxy.detach();

      const newTarget = new EventTarget();
      proxy.attach(newTarget);

      oldTarget.dispatchEvent(new Event('play'));
      expect(handler).not.toHaveBeenCalled();

      newTarget.dispatchEvent(new Event('play'));
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('EventListenerObject support', () => {
    it('invokes handleEvent on an object listener', () => {
      const { proxy, target } = setup();
      const obj = { handleEvent: vi.fn() };

      proxy.addEventListener('play', obj);
      target.dispatchEvent(new Event('play'));

      expect(obj.handleEvent).toHaveBeenCalledOnce();
    });

    it('invokes handleEvent for once object listeners', () => {
      const { proxy, target } = setup();
      const obj = { handleEvent: vi.fn() };

      proxy.addEventListener('play', obj, { once: true });
      target.dispatchEvent(new Event('play'));
      target.dispatchEvent(new Event('play'));

      expect(obj.handleEvent).toHaveBeenCalledOnce();
    });
  });
});
