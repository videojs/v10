import type { Constructor } from '@videojs/utils/types';
import { describe, expect, it, vi } from 'vitest';
import { bridgeEvents } from '../../utils/bridge-events';
import { ProxyMixin } from '../proxy';

interface MediaBase extends EventTarget {
  readonly target: EventTarget | null;
  attach?(target: EventTarget): void;
  detach?(): void;
}

function TestMediaMixin<Base extends Constructor<MediaBase>>(BaseClass: Base) {
  return class TestMedia extends BaseClass {
    #subDelegate = new EventTarget();
    #src = '';

    get src() {
      return this.#src;
    }

    set src(value: string) {
      this.#src = value;
    }

    fire() {
      this.#subDelegate.dispatchEvent(new Event('custom'));
    }

    attach(target: EventTarget) {
      bridgeEvents(this.#subDelegate, this);
      super.attach?.(target);
    }

    detach() {
      super.detach?.();
    }
  };
}

function InterceptingMixin<Base extends Constructor<MediaBase>>(BaseClass: Base) {
  return class InterceptingMedia extends BaseClass {
    attach(target: EventTarget) {
      target.addEventListener('error', (event) => {
        event.stopImmediatePropagation();
        this.dispatchEvent(new CustomEvent('error', { detail: 'enriched' }));
      });
      super.attach?.(target);
    }

    detach() {
      super.detach?.();
    }
  };
}

describe('Media Mixins', () => {
  describe('event bridging from sub-delegates', () => {
    it('forwards events dispatched by a sub-delegate to the host', () => {
      class Base extends EventTarget {
        get target() {
          return null;
        }
      }
      const Mixed = TestMediaMixin(Base as unknown as Constructor<MediaBase>);
      const host = new Mixed();

      const handler = vi.fn();
      host.addEventListener('custom', handler);

      host.attach(new EventTarget());
      host.fire();

      expect(handler).toHaveBeenCalledOnce();
    });

    it('creates a new event instance for the host dispatch', () => {
      class Base extends EventTarget {
        get target() {
          return null;
        }
      }
      const Mixed = TestMediaMixin(Base as unknown as Constructor<MediaBase>);
      const host = new Mixed();
      const hostEvents: Event[] = [];
      host.addEventListener('custom', (e) => hostEvents.push(e));

      host.attach(new EventTarget());
      host.fire();

      expect(hostEvents).toHaveLength(1);
      expect(hostEvents[0]!.type).toBe('custom');
    });
  });

  describe('property resolution via prototype chain', () => {
    it('mixin properties shadow proxy descriptors', () => {
      const ProxyBase = ProxyMixin(EventTarget);
      const Mixed = TestMediaMixin(ProxyBase as unknown as Constructor<MediaBase>);
      const host = new Mixed();

      host.src = 'test.mp4';
      expect(host.src).toBe('test.mp4');
    });
  });

  describe('attach chaining with ProxyMixin', () => {
    it('interceptor fires before proxy forwarder when listener added pre-attach', () => {
      const ProxyBase = ProxyMixin(EventTarget);
      const Mixed = InterceptingMixin(ProxyBase as unknown as Constructor<MediaBase>);

      const host = new Mixed();
      const handler = vi.fn();
      host.addEventListener('error', handler);

      const target = new EventTarget();
      host.attach(target);

      target.dispatchEvent(new Event('error'));

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0]![0] as CustomEvent;
      expect(event.detail).toBe('enriched');
    });
  });
});
