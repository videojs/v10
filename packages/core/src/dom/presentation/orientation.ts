import { isFunction } from '@videojs/utils/predicate';

export interface ScreenOrientationLock {
  lock(): Promise<void>;
  unlock(): void;
}

export type ScreenOrientationLockType =
  | 'any'
  | 'landscape'
  | 'landscape-primary'
  | 'landscape-secondary'
  | 'natural'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary';

export interface ScreenOrientationLockConfig {
  type?: ScreenOrientationLockType | undefined;
}

interface ScreenOrientation {
  lock?: ((type: ScreenOrientationLockType) => Promise<void>) | undefined;
  unlock?: (() => void) | undefined;
}

export function createScreenOrientationLock({
  type = 'landscape',
}: ScreenOrientationLockConfig = {}): ScreenOrientationLock {
  let locked = false;
  let generation = 0;

  const releaseOrientation = () => {
    const orientation = globalThis.screen?.orientation as ScreenOrientation | undefined;
    const unlock = orientation?.unlock;

    if (!isFunction(unlock)) return;

    try {
      unlock.call(orientation);
    } catch {}
  };

  return {
    async lock() {
      if (locked) return;

      const orientation = globalThis.screen?.orientation as ScreenOrientation | undefined;
      const lock = orientation?.lock;

      if (!isFunction(lock)) return;

      const lockGeneration = ++generation;

      try {
        await lock.call(orientation, type);
      } catch {
        return;
      }

      if (lockGeneration === generation) {
        locked = true;
      } else {
        releaseOrientation();
      }
    },

    unlock() {
      generation += 1;

      if (!locked) return;

      locked = false;
      releaseOrientation();
    },
  };
}
