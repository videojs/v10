'use client';

import type { MediaEngineHost } from '@videojs/core';
import type { RefCallback } from 'react';
import { useCallback } from 'react';

export function useAttachIframe<T extends HTMLIFrameElement>(media: MediaEngineHost): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      if (element) media.attach?.(element);
      else media.detach?.();
      return () => media.detach?.();
    },
    [media]
  );
}
