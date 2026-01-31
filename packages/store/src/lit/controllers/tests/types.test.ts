import { describe, expectTypeOf, it } from 'vitest';

import { createState } from '../../../core/state';
import { createTestHost } from '../../tests/test-utils';
import { SnapshotController } from '../snapshot-controller';

describe('controller types', () => {
  describe('SnapshotController', () => {
    it('value has state type', () => {
      const state = createState({ volume: 1, muted: false });
      const host = createTestHost();

      const controller = new SnapshotController(host, state);

      // controller.value is the unwrapped type (without Reactive brand)
      expectTypeOf(controller.value).toEqualTypeOf<{
        volume: number;
        muted: boolean;
      }>();
    });

    it('value properties have correct types', () => {
      const state = createState({ volume: 1, muted: false });
      const host = createTestHost();

      const controller = new SnapshotController(host, state);

      expectTypeOf(controller.value.volume).toEqualTypeOf<number>();
      expectTypeOf(controller.value.muted).toEqualTypeOf<boolean>();
    });
  });
});
