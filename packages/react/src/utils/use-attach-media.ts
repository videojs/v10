'use client';

import type { MediaEngineHost } from '@videojs/core';
import type { RefCallback } from 'react';
import { useCallback } from 'react';

/**
 * Return a ref callback that attaches the element to a media engine and detaches on unmount.
 *
 * @param media - Media engine host to bind the rendered element to.
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
