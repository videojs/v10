'use client';

import type { Media } from '@videojs/core';
import { useState } from 'react';

import { useMediaAttach } from '../player/context';
import { useDestroy } from './use-destroy';

/**
 * Create and manage a media instance lifecycle within a player context.
 *
 * Instantiates the media class once, attaches it to the player on mount,
 * and safely detaches on unmount using a functional updater to avoid race
 * conditions when swapping media components (e.g. DashVideo → HlsVideo).
 *
 * An optional `setup` callback runs once on mount — e.g. to add media
 * components via `addComponent`. Components registered there are destroyed
 * together with the media instance on unmount (`media.destroy()` destroys
 * all of its registered components).
 */
export function useMediaInstance<Instance extends Media & { destroy(): void }>(
  MediaClass: new () => Instance,
  setup?: (media: Instance) => void
): Instance {
  const [instance] = useState(() => new MediaClass());
  const setMedia = useMediaAttach();

  useDestroy(
    instance,
    () => {
      setup?.(instance);
      setMedia?.(instance);
    },
    () => setMedia?.((prev) => (prev === instance ? null : prev))
  );

  return instance;
}
