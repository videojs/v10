'use client';

import { type MediaStreamType, MediaStreamTypes } from '@videojs/media';
import type { MuxContentData } from '@videojs/media/dom/mux/source';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * What the storyboard track needs from whichever Mux Media renders it.
 *
 * Structural on purpose: the hls.js-backed `MuxMedia` and the SPF-backed one
 * satisfy it identically, so this component carries no engine.
 */
export interface MuxStoryboardMedia {
  readonly streamType: MediaStreamType | undefined;
  readonly contentData: MuxContentData;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

/**
 * Renders the storyboard track in its own component so media changes don't
 * re-render the whole media component.
 */
export function MuxStoryboard({ media }: { media: MuxStoryboardMedia }) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      media.addEventListener('streamtypechange', onChange);
      media.addEventListener('sourcechange', onChange);
      return () => {
        media.removeEventListener('streamtypechange', onChange);
        media.removeEventListener('sourcechange', onChange);
      };
    },
    [media]
  );

  // The stream type is detected at runtime and live streams have no storyboard.
  // The '' fallback keeps the snapshot a string rather than sometimes undefined.
  const getSnapshot = () => (media.streamType === MediaStreamTypes.LIVE ? '' : (media.contentData.storyboard ?? ''));
  const src = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!src) return null;
  return <track kind="metadata" label="thumbnails" src={src} default />;
}
