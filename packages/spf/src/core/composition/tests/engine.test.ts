import { describe, expect, it } from 'vitest';
import type { Signal } from '../../signals/primitives';
import { update } from '../../signals/primitives';
import { createComposition } from '../engine';

interface Resource {
  id: string;
}

describe('createComposition', () => {
  describe('destroy()', () => {
    it('clears owners populated by a behavior during setup', async () => {
      const composition = createComposition([
        ({ owners }: { owners: Signal<{ resource?: Resource }> }) => {
          update(owners, { resource: { id: 'r1' } });
        },
      ]);

      expect(composition.owners.get().resource).toEqual({ id: 'r1' });

      await composition.destroy();

      expect(composition.owners.get()).toEqual({});
    });

    it('clears owners populated via initialOwners', async () => {
      const resource: Resource = { id: 'r1' };
      const composition = createComposition([(_: { owners: Signal<{ resource?: Resource }> }) => {}], {
        initialOwners: { resource },
      });

      expect(composition.owners.get().resource).toBe(resource);

      await composition.destroy();

      expect(composition.owners.get()).toEqual({});
    });

    it('runs behavior cleanups with owners still populated, then clears', async () => {
      const resource: Resource = { id: 'r1' };
      let ownersSeenByCleanup: { resource?: Resource } | null = null;

      const composition = createComposition(
        [
          ({ owners }: { owners: Signal<{ resource?: Resource }> }) => {
            return () => {
              ownersSeenByCleanup = owners.get();
            };
          },
        ],
        { initialOwners: { resource } }
      );

      await composition.destroy();

      expect(ownersSeenByCleanup).toEqual({ resource });
      expect(composition.owners.get()).toEqual({});
    });

    it('awaits async cleanups before clearing owners', async () => {
      let cleanupCompleted = false;

      const composition = createComposition(
        [
          (_: { owners: Signal<{ resource?: Resource }> }) => {
            return async () => {
              await new Promise<void>((resolve) => setTimeout(resolve, 10));
              cleanupCompleted = true;
            };
          },
        ],
        { initialOwners: { resource: { id: 'r1' } } }
      );

      const destroyPromise = composition.destroy();
      expect(cleanupCompleted).toBe(false);

      await destroyPromise;

      expect(cleanupCompleted).toBe(true);
      expect(composition.owners.get()).toEqual({});
    });

    it('clears owners across multiple keys from multiple behaviors', async () => {
      const composition = createComposition([
        ({ owners }: { owners: Signal<{ a?: Resource }> }) => {
          update(owners, { a: { id: 'a1' } });
        },
        ({ owners }: { owners: Signal<{ b?: Resource }> }) => {
          update(owners, { b: { id: 'b1' } });
        },
      ]);

      expect(composition.owners.get()).toMatchObject({
        a: { id: 'a1' },
        b: { id: 'b1' },
      });

      await composition.destroy();

      expect(composition.owners.get()).toEqual({});
    });
  });
});
