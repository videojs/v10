import { describe, expectTypeOf, it } from 'vitest';

import { createState } from '../../../core/state';
import { createCoreTestStore, createMockHost } from '../../tests/test-utils';
import { QueueController } from '../queue-controller';
import { SnapshotController } from '../snapshot-controller';

describe('controller types', () => {
  describe('SnapshotController', () => {
    it('value has state type', () => {
      const state = createState({ volume: 1, muted: false });
      const host = createMockHost();

      const controller = new SnapshotController(host, state);

      // controller.value is the unwrapped type (without Reactive brand)
      expectTypeOf(controller.value).toEqualTypeOf<{
        volume: number;
        muted: boolean;
      }>();
    });

    it('value properties have correct types', () => {
      const state = createState({ volume: 1, muted: false });
      const host = createMockHost();

      const controller = new SnapshotController(host, state);

      expectTypeOf(controller.value.volume).toEqualTypeOf<number>();
      expectTypeOf(controller.value.muted).toEqualTypeOf<boolean>();
    });
  });

  describe('QueueController', () => {
    it('value is tasks record', () => {
      const { store } = createCoreTestStore();
      const host = createMockHost();

      const controller = new QueueController(host, store);

      // Value type matches store.queue.tasks
      expectTypeOf(controller.value).toMatchTypeOf(store.queue.tasks);
    });
  });
});
