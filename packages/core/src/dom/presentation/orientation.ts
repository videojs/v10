import { isFunction, isNull } from '@videojs/utils/predicate';

export interface ScreenOrientationLock {
  /**
   * Requests `type`, replacing a lock already held for a different type. Requests never overlap: while one is in
   * flight, a later call only records the new type and the running request applies it once it settles.
   */
  lock(type: ScreenOrientationLockType): Promise<void>;
  unlock(): void;
}

/** Orientation types accepted by the Screen Orientation API's `screen.orientation.lock()`. */
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
  /** Type the caller last asked for, or null once released. */
  let desired: ScreenOrientationLockType | null = null;
  /** Type the platform accepted, or null while no lock is held. */
  let held: ScreenOrientationLockType | null = null;
  /** Set while a platform request is in flight. */
  let settling = false;

  const releaseOrientation = () => {
    const orientation = globalThis.screen?.orientation as ScreenOrientation | undefined;
    const unlock = orientation?.unlock;
    if (!isFunction(unlock)) return;

    try {
      unlock.call(orientation);
    } catch {}
  };

  /**
   * Drives the platform toward `desired`, one request at a time. A re-entrant call returns immediately because the
   * running pass re-reads `desired` before it exits, so the last requested type wins without overlapping requests whose
   * settle order the platform does not guarantee.
   */
  const reconcile = async () => {
    if (settling) return;

    settling = true;

    try {
      while (desired !== held) {
        const target = desired;

        if (isNull(target)) {
          releaseOrientation();
          held = null;
          continue;
        }

        const orientation = globalThis.screen?.orientation as ScreenOrientation | undefined;
        const lock = orientation?.lock;
        if (!isFunction(lock)) return;

        try {
          await lock.call(orientation, target);
        } catch {
          // Leave `held` alone so it keeps describing the platform. Retrying
          // the same type here would spin, so wait for the next request.
          if (desired === target) return;

          continue;
        }

        held = target;
      }
    } finally {
      settling = false;
    }
  };

  return {
    lock(type) {
      desired = type;
      return reconcile();
    },

    unlock() {
      desired = null;
      void reconcile();
    },
  };
}
