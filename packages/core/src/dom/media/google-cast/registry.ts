import type { GoogleCast } from './google-cast';
import { getCastContext, loadCastFramework, onCastApiAvailable } from './utils';

export const googleCastInstances = new Set<GoogleCast>();

export let castFramework: typeof cast.framework | undefined;

let pendingCastFramework: Promise<typeof cast.framework> | null = null;

export async function ensureCastFramework(): Promise<typeof cast.framework> {
  if (castFramework) return castFramework;

  pendingCastFramework ??= loadCastFramework().then(
    () =>
      new Promise<typeof cast.framework>((resolve, reject) => {
        onCastApiAvailable(() => {
          registerCastFramework();

          if (castFramework) {
            resolve(castFramework);
            return;
          }

          reject(new DOMException('Google Cast framework is unavailable.', 'NotSupportedError'));
        });
      })
  );

  return pendingCastFramework;
}

function registerCastFramework(): void {
  if (!globalThis.chrome?.cast?.isAvailable) {
    if (__DEV__) {
      console.debug('chrome.cast.isAvailable', globalThis.chrome?.cast?.isAvailable);
    }
    return;
  }

  if (!castFramework) {
    castFramework = cast.framework;

    getCastContext()!.addEventListener(castFramework.CastContextEventType.CAST_STATE_CHANGED, () => {
      googleCastInstances.forEach((provider) => provider.onCastStateChanged());
    });

    getCastContext()!.addEventListener(castFramework.CastContextEventType.SESSION_STATE_CHANGED, () => {
      googleCastInstances.forEach((provider) => provider.onSessionStateChanged());
    });

    googleCastInstances.forEach((provider) => provider.onCastFrameworkAvailable());
  }
}
