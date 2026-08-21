import type { MediaEngineHost } from '@videojs/media';
import type { RefCallback } from 'react';
import { useCallback } from 'react';

export function useAttachCanvas<T extends HTMLCanvasElement>(media: MediaEngineHost): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      if (element) media.attach?.(element);
      else media.detach?.();
      return () => media.detach?.();
    },
    [media]
  );
}
