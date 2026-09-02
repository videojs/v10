import type { EngineAdapter } from '@videojs/media';
import type { RefCallback } from 'react';
import { useCallback } from 'react';

/**
 * Returns a callback ref that attaches an HTML media element to a playback adapter and detaches it during cleanup.
 *
 * @param media - Playback adapter to attach and detach.
 */
export function useAttachMedia<T = HTMLMediaElement>(media: EngineAdapter): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      if (element) media.attach?.(element);
      else media.detach?.();

      return () => media.detach?.();
    },
    [media]
  );
}
