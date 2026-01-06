import type { MutationResult, OptimisticResult } from '../index';

import { describe, expectTypeOf, it } from 'vitest';

import { createCoreTestStore, createMockHost } from '../../tests/test-utils';
import { MutationController } from '../mutation-controller';
import { OptimisticController } from '../optimistic-controller';
import { RequestController } from '../request-controller';
import { SelectorController } from '../selector-controller';
import { TasksController } from '../tasks-controller';

describe('controller types', () => {
  describe('SelectorController', () => {
    it('value has selected type', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => s.volume);

      expectTypeOf(controller.value).toEqualTypeOf<number>();
    });

    it('value type matches selector return type', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new SelectorController(host, store, s => ({
        volume: s.volume,
        muted: s.muted,
      }));

      expectTypeOf(controller.value).toEqualTypeOf<{ volume: number; muted: boolean }>();
    });
  });

  describe('RequestController', () => {
    it('value is the request function', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new RequestController(host, store, 'setVolume');

      expectTypeOf(controller.value).toBeFunction();
      expectTypeOf(controller.value).parameter(0).toEqualTypeOf<number>();
    });
  });

  describe('MutationController', () => {
    it('value is MutationResult', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new MutationController(host, store, 'setVolume');

      expectTypeOf(controller.value).toMatchTypeOf<MutationResult<unknown, unknown>>();
    });

    it('value has mutate function', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new MutationController(host, store, 'setVolume');

      expectTypeOf(controller.value.mutate).toBeFunction();
    });

    it('value has reset function', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new MutationController(host, store, 'setVolume');

      expectTypeOf(controller.value.reset).toEqualTypeOf<() => void>();
    });

    it('value has status property', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new MutationController(host, store, 'setVolume');

      expectTypeOf(controller.value.status).toEqualTypeOf<'idle' | 'pending' | 'success' | 'error'>();
    });
  });

  describe('OptimisticController', () => {
    it('value is OptimisticResult', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

      expectTypeOf(controller.value).toMatchTypeOf<OptimisticResult<unknown, unknown>>();
    });

    it('value has selected type', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

      expectTypeOf(controller.value.value).toEqualTypeOf<number>();
    });

    it('value has setValue function', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

      expectTypeOf(controller.value.setValue).toBeFunction();
    });

    it('value has reset function', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

      expectTypeOf(controller.value.reset).toEqualTypeOf<() => void>();
    });

    it('value has status property', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new OptimisticController(host, store, 'setVolume', s => s.volume);

      expectTypeOf(controller.value.status).toEqualTypeOf<'idle' | 'pending' | 'success' | 'error'>();
    });
  });

  describe('TasksController', () => {
    it('value is tasks record', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new TasksController(host, store);

      expectTypeOf(controller.value).toEqualTypeOf<typeof store.queue.tasks>();
    });
  });
});
