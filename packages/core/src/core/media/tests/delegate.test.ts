import { describe, expect, it, vi } from 'vitest';

import { DelegateMixin } from '../delegate';

class FakeBase extends EventTarget {
  get(_prop: string): any {}
  set(_prop: string, _val: any): void {}
  call(_prop: string, ..._args: any[]): any {}
  attach(_target: EventTarget): void {}
  detach(): void {}
}

class EventfulDelegate extends EventTarget {
  attach(_target: EventTarget): void {}
  detach(): void {}

  fire(): void {
    this.dispatchEvent(new Event('custom'));
  }
}

const Mixed = DelegateMixin(FakeBase, EventfulDelegate);

describe('DelegateMixin', () => {
  describe('event forwarding', () => {
    it('forwards events dispatched by the delegate to the host', () => {
      const host = new Mixed();
      const handler = vi.fn();
      host.addEventListener('custom', handler);

      host.fire();

      expect(handler).toHaveBeenCalledOnce();
    });

    it('creates a new event instance for the host dispatch', () => {
      const host = new Mixed();
      const hostEvents: Event[] = [];
      host.addEventListener('custom', (e) => hostEvents.push(e));

      host.fire();

      expect(hostEvents).toHaveLength(1);
      expect(hostEvents[0]!.type).toBe('custom');
    });

    it('does not forward events when delegate is not an EventTarget', () => {
      class PlainDelegate {
        attach(_target: EventTarget): void {}
        detach(): void {}
      }

      const PlainMixed = DelegateMixin(FakeBase, PlainDelegate);
      const host = new PlainMixed();
      const handler = vi.fn();
      host.addEventListener('custom', handler);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
