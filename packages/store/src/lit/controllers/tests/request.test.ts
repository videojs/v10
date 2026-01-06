import { describe, expect, it } from 'vitest';

import { RequestController } from '../request';
import { createMockHost, createTestStore } from './test-utils';

describe('RequestController', () => {
  it('returns request function', () => {
    const { store } = createTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');

    expect(typeof controller.value).toBe('function');
  });

  it('registers with host', () => {
    const { store } = createTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');

    expect(host.controllers.has(controller)).toBe(true);
  });

  it('returns stable reference', () => {
    const { store } = createTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');
    const first = controller.value;
    const second = controller.value;

    expect(first).toBe(second);
  });

  it('request works correctly', async () => {
    const { store, target } = createTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');
    await controller.value(0.7);

    expect(target.volume).toBe(0.7);
  });
});
