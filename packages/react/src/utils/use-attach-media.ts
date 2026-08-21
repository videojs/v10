import type { MediaEngineHost } from '@videojs/media';
import type { RefCallback } from 'react';

import { useAttachTarget } from './use-attach-target';

/**
 * Attach a committed media instance to a React media element ref.
 *
 * A `null` media leaves the ref inert until an instance is acquired.
 *
 * @param media - Committed media instance, or `null` while acquisition is pending.
 */
export function useAttachMedia<T extends HTMLMediaElement>(media: MediaEngineHost | null): RefCallback<T> {
  return useAttachTarget<T>(media);
}
