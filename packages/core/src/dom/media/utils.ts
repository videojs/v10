import { isHTMLMediaElement } from '@videojs/utils/dom';
import type { Media } from './types';

export function getHTMLMediaElementTarget(media: Media): HTMLMediaElement | null {
  if (isHTMLMediaElement(media)) {
    return media;
  }

  if (isHTMLMediaElement(media.target)) {
    return media.target;
  }

  return null;
}
