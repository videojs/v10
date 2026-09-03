import { CustomMediaElement, type PlaybackAdapter } from '@videojs/media/dom';
import type { Constructor } from '@videojs/utils/types';

import { MediaAttachMixin } from '../store/media-attach-mixin';

export interface CreateMediaElementOptions {
  /** Native element the adapter attaches to, rendered in the shadow root. Defaults to `'video'`. */
  tag?: 'video' | 'audio' | 'iframe';
  /**
   * Shadow template for the element, given its initial attributes. Defaults to the bare native tag; embeds pass one
   * that renders their `<iframe>` with the provider's attributes and initial URL.
   */
  template?: (attrs: Record<string, string>) => string;
}

/**
 * Build a custom element that plays through an adapter and registers itself with the surrounding player.
 *
 * The element renders its target (`<video>` by default) in its shadow root, attaches the adapter to it, and mirrors its
 * attributes onto the adapter's properties. Connecting it inside a player registers it as the player's media, the same
 * way the built-in `<hlsjs-video>`, `<dash-video>`, and `<vimeo-video>` elements do. Subclass the result to add element
 * behavior, then register it with `customElements.define()`.
 *
 * @param Adapter - Adapter class that drives playback, for example `HlsJsAdapter` from `@videojs/hlsjs-video`.
 * @param options - The target tag and, for embeds, the shadow template that renders it.
 */
export function createMediaElement<Adapter extends Constructor<PlaybackAdapter>>(
  Adapter: Adapter,
  options: CreateMediaElementOptions = {}
): ReturnType<typeof CustomMediaElement<Adapter>> {
  const { tag = 'video', template } = options;
  const Element = CustomMediaElement(tag, Adapter);

  if (template) Element.getTemplateHTML = template;

  return MediaAttachMixin(Element);
}
