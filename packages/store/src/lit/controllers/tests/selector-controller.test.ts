import { describe, expect, it } from 'vitest';

import { createCoreTestStore, createMockHost } from '../../tests/test-utils';
import { SelectorController } from '../selector-controller';

describe('SelectorController', () => {
  it('returns selected state', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new SelectorController(host, store, s => s.volume);

    expect(controller.value).toBe(1);
  });

  it('registers with host', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new SelectorController(host, store, s => s.volume);

    expect(host.controllers.has(controller)).toBe(true);
  });

  it('subscribes on hostConnected', () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new SelectorController(host, store, s => s.volume);
    controller.hostConnected();

    target.volume = 0.5;
    target.dispatchEvent(new Event('volumechange'));

    expect(controller.value).toBe(0.5);
    expect(host.updateCount).toBe(1);
  });

  it('unsubscribes on hostDisconnected', () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new SelectorController(host, store, s => s.volume);
    controller.hostConnected();
    controller.hostDisconnected();

    const updateCountBefore = host.updateCount;
    target.volume = 0.3;
    target.dispatchEvent(new Event('volumechange'));

    expect(host.updateCount).toBe(updateCountBefore);
  });

  it('syncs value on reconnect after state changed while disconnected', () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new SelectorController(host, store, s => s.volume);
    controller.hostConnected();

    expect(controller.value).toBe(1);

    controller.hostDisconnected();

    target.volume = 0.3;
    target.dispatchEvent(new Event('volumechange'));

    // Value should still be stale (not subscribed)
    expect(controller.value).toBe(1);

    // Reconnect - should have current value
    controller.hostConnected();

    expect(controller.value).toBe(0.3);
  });

  it('does not trigger update when unrelated state changes', () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new SelectorController(host, store, s => s.volume);
    controller.hostConnected();

    target.muted = true;
    target.dispatchEvent(new Event('volumechange'));

    // Volume didn't change, so no update should be triggered
    expect(host.updateCount).toBe(0);
  });

  it('handles multiple reconnect cycles', () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new SelectorController(host, store, s => s.volume);

    // First connect/disconnect
    controller.hostConnected();
    target.volume = 0.5;
    target.dispatchEvent(new Event('volumechange'));
    expect(controller.value).toBe(0.5);
    controller.hostDisconnected();

    // Change while disconnected
    target.volume = 0.3;
    target.dispatchEvent(new Event('volumechange'));

    // Second connect - should sync to current value
    controller.hostConnected();
    expect(controller.value).toBe(0.3);

    // Changes should work again
    target.volume = 0.8;
    target.dispatchEvent(new Event('volumechange'));
    expect(controller.value).toBe(0.8);
  });
});
