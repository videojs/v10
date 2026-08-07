import { isFunction, isNull } from '@videojs/utils/predicate';

export interface ScreenOrientationLock {
  /** Requests `type`, replacing a lock already held for a different type. */
  lock(type: ScreenOrientationLockType): Promise<void>;
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

interface ScreenOrientation {
  lock?: ((type: ScreenOrientationLockType) => Promise<void>) | undefined;
  unlock?: (() => void) | undefined;
}

export function createScreenOrientationLock(): ScreenOrientationLock {
  let locked = false;
  // Last requested type, or null once released. Compared after the async lock
  // request settles so a superseded request commits nothing.
  let desired: ScreenOrientationLockType | null = null;

  const releaseOrientation = () => {
    const orientation = globalThis.screen?.orientation as ScreenOrientation | undefined;
    const unlock = orientation?.unlock;

    if (!isFunction(unlock)) return;

    try {
      unlock.call(orientation);
    } catch {}
  };

  return {
    async lock(type) {
      if (locked && desired === type) return;
      desired = type;

      const orientation = globalThis.screen?.orientation as ScreenOrientation | undefined;
      const lock = orientation?.lock;

      if (!isFunction(lock)) return;

      try {
        await lock.call(orientation, type);
      } catch {
        return;
      }

      if (desired === type) {
        locked = true;
      } else if (isNull(desired)) {
        releaseOrientation();
      }
    },

    unlock() {
      desired = null;

      if (!locked) return;

      locked = false;
      releaseOrientation();
    },
  };
}
