'use client';

import type { RefCallback } from 'react';
import { useCallback } from 'react';

export function useAttachMedia<T extends HTMLMediaElement>(media: { target: T | null }): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      media.target = element;
      return () => {
        media.target = null;
      };
    },
    [media]
  );
}
