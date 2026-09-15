import { CustomMediaElement, type CustomMediaElementConfig, type PlaybackAdapterConstructor } from '@videojs/media/dom';

import { MediaAttachMixin } from '../store/media-attach-mixin';

export type CreateMediaElementOptions<Adapter extends PlaybackAdapterConstructor> = CustomMediaElementConfig<Adapter>;
export {
  audioContentAttributes,
  audioTarget,
  iframeTarget,
  mediaContentAttributes,
  videoContentAttributes,
  videoTarget,
} from '@videojs/media/dom';
export type {
  MediaAttributeDeclaration,
  MediaAttributeDeclarations,
  MediaAttributeDeclarationsFor,
  MediaTargetDefinition,
  MediaTargetRenderContext,
} from '@videojs/media/dom';

/**
 * Build a custom element that plays through an adapter and registers itself with the surrounding player.
 *
 * The target definition supplies default rendering and resolves the adapter target. The element attaches the adapter to
 * it and reflects primitive adapter `defaultProps` as content attributes alongside any target-native attributes
 * declared by the definition. Connecting it inside a player registers it as the player's media, the same way the
 * built-in `<hlsjs-video>`, `<dash-video>`, and `<vimeo-video>` elements do. Subclass the result to add element
 * behavior, then register it with `customElements.define()`.
 *
 * @param options - The playback adapter and target definition used to render and manage its concrete target.
 */
export function createMediaElement<Adapter extends PlaybackAdapterConstructor>(
  options: CreateMediaElementOptions<Adapter>
): ReturnType<typeof CustomMediaElement<Adapter>> {
  return MediaAttachMixin(CustomMediaElement(options));
}
