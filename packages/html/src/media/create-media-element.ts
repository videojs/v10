import { CustomMediaElement, type CustomMediaElementConfig, type PlaybackAdapterConstructor } from '@videojs/media/dom';

import { MediaAttachMixin } from '../store/media-attach-mixin';

export type CreateMediaElementOptions<
  Adapter extends PlaybackAdapterConstructor,
  Target extends EventTarget = EventTarget,
> = CustomMediaElementConfig<Adapter, Target>;
export { audioHost, iframeHost, videoHost } from '@videojs/media/dom';
export type { MediaElementHost } from '@videojs/media/dom';

/**
 * Build a custom element that plays through an adapter and registers itself with the surrounding player.
 *
 * The host renders and resolves the adapter target. The element attaches the adapter to it and reflects primitive
 * adapter `defaultProps` as content attributes alongside any target-native attributes declared by the host. Connecting
 * it inside a player registers it as the player's media, the same way the built-in `<hlsjs-video>`, `<dash-video>`, and
 * `<vimeo-video>` elements do. Subclass the result to add element behavior, then register it with
 * `customElements.define()`.
 *
 * @param options - The playback adapter and independent policy for rendering and managing its target.
 */
export function createMediaElement<Adapter extends PlaybackAdapterConstructor, Target extends EventTarget>(
  options: CreateMediaElementOptions<Adapter, Target>
): ReturnType<typeof CustomMediaElement<Adapter, Target>> {
  return MediaAttachMixin(CustomMediaElement(options));
}
