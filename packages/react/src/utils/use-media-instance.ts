'use client';

import type { Media } from '@videojs/core/dom';

import { useMediaAttach } from '../player/context';
import { useDestroy } from './use-destroy';

interface Destroyable {
  destroy(): void;
}

/**
 * Manage a media instance lifecycle within a player context.
 *
 * Attaches the instance to the player on mount and safely detaches on
 * unmount using a functional updater to avoid race conditions when
 * swapping media components (e.g. DashVideo → HlsVideo).
 */
export function useMediaInstance(instance: Media & Destroyable): void {
  const setMedia = useMediaAttach();

  useDestroy(
    instance,
    () => setMedia?.(instance),
    () => setMedia?.((prev) => (prev === instance ? null : prev))
  );
}
