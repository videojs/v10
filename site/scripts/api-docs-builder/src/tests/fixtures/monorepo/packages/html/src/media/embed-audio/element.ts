/**
 * Mock iframe-backed audio element — mirrors SpotifyAudio.
 *
 * Exercises: an `iframe` host classified as audio from the media class name, which the define file exports with an
 * `Element` suffix.
 */
import { CustomMediaElement } from '../../../../media/src/dom/custom-media-element';
import { EmbedHost } from '../../../../media/src/dom/embed';

function MediaAttachMixin(base: any) {
  return base;
}

/**
 * @mediaType audio
 * @mediaTarget iframe
 */
export class EmbedPodcastElement extends MediaAttachMixin(CustomMediaElement({ Adapter: EmbedHost, host: {} })) {
  static readonly tagName = 'embed-audio';
}
