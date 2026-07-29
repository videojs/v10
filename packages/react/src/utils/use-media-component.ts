'use client';

import type { HTMLMediaTargetLike, MediaComponent } from '@videojs/media/dom/media-host';
import { addMediaComponent, HTMLMediaElementHost } from '@videojs/media/dom/media-host';
import { useEffect, useState } from 'react';

import { useMedia } from '../player/context';
import { useDestroy } from './use-destroy';

/**
 * Create a media component (e.g. `GoogleCast`, `MuxData`) and register it
 * with the media provided by the surrounding player context.
 *
 * Instantiates the component class once, registers it when a media host is
 * available, follows the media when it changes, and destroys the component
 * on unmount. Media that is not a media host (e.g. a plain `<video>`
 * element) cannot carry media components and is ignored.
 */
export function useMediaComponent<Component extends MediaComponent & { destroy(): void }>(
  ComponentClass: new () => Component
): Component {
  const media = useMedia();
  const [component] = useState(() => new ComponentClass());

  useDestroy(component);

  useEffect(() => {
    if (!(media instanceof HTMLMediaElementHost)) return;
    return addMediaComponent(media as HTMLMediaElementHost<HTMLMediaTargetLike, any>, component);
  }, [media, component]);

  return component;
}
