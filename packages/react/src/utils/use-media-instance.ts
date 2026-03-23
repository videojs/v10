'use client';

import type { Media } from '@videojs/core/dom';
import { useState } from 'react';

import { useMediaAttach } from '../player/context';
import { useDestroy } from './use-destroy';

/**
 * Create and manage a media instance lifecycle within a player context.
 *
 * Instantiates the media class once, attaches it to the player on mount,
 * and safely detaches on unmount using a functional updater to avoid race
 * conditions when swapping media components (e.g. DashVideo → HlsVideo).
 */
export function useMediaInstance<Instance extends Media & { destroy(): void }>(
  MediaClass: new () => Instance
): Instance {
  const [instance] = useState(() => new MediaClass());
  const setMedia = useMediaAttach();

  useDestroy(
    instance,
    () => setMedia?.(instance),
    () => setMedia?.((prev) => (prev === instance ? null : prev))
  );

  return instance;
}
