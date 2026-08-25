import type { MediaEngineHost } from '@videojs/media';
import type { RefCallback } from 'react';
import { useCallback } from 'react';

/**
 * Returns a callback ref that attaches an HTML media element to a media engine host and detaches it during cleanup.
 *
 * @param media - Media engine host to attach and detach.
 */
export function useAttachMedia<T extends HTMLMediaElement>(media: MediaEngineHost): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      if (element) media.attach?.(element);
      else media.detach?.();

      return () => media.detach?.();
    },
    [media]
  );
}
