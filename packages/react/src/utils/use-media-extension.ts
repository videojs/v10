import {
  addMediaExtension,
  HTMLMediaElementHost,
  type HTMLMediaTargetLike,
  type MediaExtension,
} from '@videojs/media/dom';
import { useEffect, useState } from 'react';

import { useMedia } from '../player/context';
import { useDestroy } from './use-destroy';

/**
 * Create a media extension and register it with the media provided by the surrounding player context.
 *
 * Instantiates the extension class once, registers it when a media host is available, follows the media when it
 * changes, and destroys the extension on unmount. Media that is not a media host (e.g. a plain `<video>` element)
 * cannot carry media extensions and is ignored.
 *
 * @param ExtensionClass - Media extension class to instantiate and register.
 */
export function useMediaExtension<Component extends MediaExtension & { destroy(): void }>(
  ExtensionClass: new () => Component
): Component {
  const media = useMedia();
  const [component] = useState(() => new ExtensionClass());

  useDestroy(component);

  useEffect(() => {
    if (!(media instanceof HTMLMediaElementHost)) return;

    return addMediaExtension(media as HTMLMediaElementHost<HTMLMediaTargetLike, any>, component);
  }, [media, component]);

  return component;
}
