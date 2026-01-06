import { describe, expect, it } from 'vitest';

import { createCoreTestStore, createMockHost } from '../../tests/test-utils';
import { RequestController } from '../request-controller';

describe('RequestController', () => {
  it('returns request function', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');

    expect(typeof controller.value).toBe('function');
  });

  it('registers with host', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');

    expect(host.controllers.has(controller)).toBe(true);
  });

  it('returns stable reference', () => {
    const { store } = createCoreTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');
    const first = controller.value;
    const second = controller.value;

    expect(first).toBe(second);
  });

  it('request works correctly', async () => {
    const { store, target } = createCoreTestStore();
    const host = createMockHost();

    const controller = new RequestController(host, store, 'setVolume');
    await controller.value(0.7);

    expect(target.volume).toBe(0.7);
  });
});
