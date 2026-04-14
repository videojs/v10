import type { Constructor } from '@videojs/utils/types';
import { describe, expect, it, vi } from 'vitest';
import { bridgeEvents } from '../../utils/bridge-events';

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
});
