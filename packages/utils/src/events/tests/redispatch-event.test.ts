import { describe, expect, it, vi } from 'vite-plus/test';

import { redispatchEvent } from '../redispatch-event';

describe('redispatchEvent', () => {
  it('dispatches a distinct event with the same type', () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const event = new Event('change');

    target.addEventListener('change', listener);
    redispatchEvent(target, event);

    const copy = listener.mock.calls[0]![0];

    expect(copy).not.toBe(event);
    expect(copy.type).toBe('change');
  });

  it('preserves a custom event subclass and detail', () => {
    const target = new EventTarget();
    const listener = vi.fn();

    target.addEventListener('change', listener);
    redispatchEvent(target, new CustomEvent('change', { detail: { value: 1 } }));

    const copy = listener.mock.calls[0]![0];

    expect(copy).toBeInstanceOf(CustomEvent);
    expect(copy.detail).toEqual({ value: 1 });
  });

  it('runs beforeDispatch with the copied event before listeners', () => {
    const target = new EventTarget();
    const order: string[] = [];

    target.addEventListener('change', () => order.push('listener'));
    redispatchEvent(target, new Event('change'), { beforeDispatch: () => order.push('before') });

    expect(order).toEqual(['before', 'listener']);
  });

  it('falls back to a base event when the subclass cannot be copied', () => {
    class NonCopyableEvent extends Event {
      detail = 'original-only';

      constructor(type: string, init?: EventInit) {
        if (init) throw new TypeError('cannot copy');

        super(type);
      }
    }

    const target = new EventTarget();
    const listener = vi.fn();

    target.addEventListener('change', listener);
    redispatchEvent(target, new NonCopyableEvent('change'));

    const copy = listener.mock.calls[0]![0];

    expect(copy).toBeInstanceOf(Event);
    expect(copy).not.toBeInstanceOf(NonCopyableEvent);
    expect(copy).not.toHaveProperty('detail');
  });

  it('returns the dispatch result', () => {
    const target = new EventTarget();

    target.addEventListener('change', (event) => event.preventDefault());

    expect(redispatchEvent(target, new Event('change', { cancelable: true }))).toBe(false);
  });
});
