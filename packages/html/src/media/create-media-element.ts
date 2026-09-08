import {
  CustomMediaElement,
  type CustomMediaElementOptions,
  type PlaybackAdapterConstructor,
} from '@videojs/media/dom';

import { MediaAttachMixin } from '../store/media-attach-mixin';

export type CreateMediaElementOptions = CustomMediaElementOptions;

/**
 * Build a custom element that plays through an adapter and registers itself with the surrounding player.
 *
 * The element renders the adapter's `host` element (`<video>`, `<audio>`, or `<iframe>`) in its shadow root, attaches
 * the adapter to it, and reflects the adapter's `defaultProps` as content attributes alongside the ones the host
 * accepts natively. Connecting it inside a player registers it as the player's media, the same way the built-in
 * `<hlsjs-video>`, `<dash-video>`, and `<vimeo-video>` elements do. Subclass the result to add element behavior, then
 * register it with `customElements.define()`.
 *
 * @param Adapter - Adapter class that drives playback, for example `HlsJsAdapter` from `@videojs/hlsjs-video`.
 * @param options - For embeds, the shadow template that renders the `<iframe>`.
 */
export function createMediaElement<Adapter extends PlaybackAdapterConstructor>(
  Adapter: Adapter,
  options: CreateMediaElementOptions = {}
): ReturnType<typeof CustomMediaElement<Adapter>> {
  return MediaAttachMixin(CustomMediaElement(Adapter, options));
}
