import { describe, expect, it } from 'vitest';
import type { Signal } from '../../../core/signals/primitives';
import { update } from '../../../core/signals/primitives';
import { createComposition } from '../engine';

describe('createComposition', () => {
  describe('destroy()', () => {
    it('clears owners populated by a behavior during setup', async () => {
      const composition = createComposition([
        ({ owners }: { owners: Signal<{ el?: HTMLElement }> }) => {
          update(owners, { el: document.createElement('div') });
        },
      ]);

      expect(composition.owners.get().el).toBeInstanceOf(HTMLElement);

      await composition.destroy();

      expect(composition.owners.get()).toEqual({});
    });

    it('clears owners populated via initialOwners', async () => {
      const el = document.createElement('div');
      const composition = createComposition([(_: { owners: Signal<{ el?: HTMLElement }> }) => {}], {
        initialOwners: { el },
      });

      expect(composition.owners.get().el).toBe(el);

      await composition.destroy();

      expect(composition.owners.get()).toEqual({});
    });

    it('runs behavior cleanups with owners still populated, then clears', async () => {
      const el = document.createElement('div');
      let ownersSeenByCleanup: { el?: HTMLElement } | null = null;

      const composition = createComposition(
        [
          ({ owners }: { owners: Signal<{ el?: HTMLElement }> }) => {
            return () => {
              ownersSeenByCleanup = owners.get();
            };
          },
        ],
        { initialOwners: { el } }
      );

      await composition.destroy();

      expect(ownersSeenByCleanup).toEqual({ el });
      expect(composition.owners.get()).toEqual({});
    });

    it('awaits async cleanups before clearing owners', async () => {
      let cleanupCompleted = false;

      const composition = createComposition(
        [
          (_: { owners: Signal<{ el?: HTMLElement }> }) => {
            return async () => {
              await new Promise<void>((resolve) => setTimeout(resolve, 10));
              cleanupCompleted = true;
            };
          },
        ],
        { initialOwners: { el: document.createElement('div') } }
      );

      const destroyPromise = composition.destroy();
      expect(cleanupCompleted).toBe(false);

      await destroyPromise;

      expect(cleanupCompleted).toBe(true);
      expect(composition.owners.get()).toEqual({});
    });

    it('clears owners across multiple keys from multiple behaviors', async () => {
      const composition = createComposition([
        ({ owners }: { owners: Signal<{ a?: HTMLElement }> }) => {
          update(owners, { a: document.createElement('div') });
        },
        ({ owners }: { owners: Signal<{ b?: HTMLElement }> }) => {
          update(owners, { b: document.createElement('span') });
        },
      ]);

      expect(composition.owners.get()).toMatchObject({
        a: expect.any(HTMLElement),
        b: expect.any(HTMLElement),
      });

      await composition.destroy();

      expect(composition.owners.get()).toEqual({});
    });
  });
});
