import { describe, expect, it, vi } from 'vite-plus/test';

import { EventForwarder } from '../event-forwarder';

describe('EventForwarder', () => {
  it('forwards subscribed event types as distinct events', () => {
    const source = new EventTarget();
    const target = new EventTarget();
    const listener = vi.fn();
    const event = new Event('change');
    const forwarder = new EventForwarder(source, target);

    target.addEventListener('change', listener);
    forwarder.forward('change');
    source.dispatchEvent(event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0]).not.toBe(event);
  });

  it('subscribes to each event type once', () => {
    const source = new EventTarget();
    const target = new EventTarget();
    const listener = vi.fn();
    const forwarder = new EventForwarder(source, target);

    target.addEventListener('change', listener);
    forwarder.forward('change');
    forwarder.forward('change');
    source.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('filters source events', () => {
    const source = new EventTarget();
    const target = new EventTarget();
    const listener = vi.fn();
    const forwarder = new EventForwarder(source, target, { filter: (event) => !event.composed });

    target.addEventListener('change', listener);
    forwarder.forward('change');
    source.dispatchEvent(new Event('change', { composed: true }));
    source.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });

  it('stops forwarding after disposal and can subscribe again', () => {
    const source = new EventTarget();
    const target = new EventTarget();
    const listener = vi.fn();
    const forwarder = new EventForwarder(source, target);

    target.addEventListener('change', listener);
    forwarder.forward('change');
    forwarder.dispose();
    source.dispatchEvent(new Event('change'));
    forwarder.forward('change');
    source.dispatchEvent(new Event('change'));

    expect(listener).toHaveBeenCalledOnce();
  });
});
