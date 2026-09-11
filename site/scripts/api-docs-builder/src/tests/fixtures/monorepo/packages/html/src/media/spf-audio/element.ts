/**
 * Mock audio-only media element — mirrors HlsAudio.
 *
 * Exercises: audio media type, inherited from the `HTMLAudioAdapter` root of a
 * cross-package mixin host.
 */
import { CustomMediaElement } from '../../../../media/src/dom/custom-media-element';
import { SpfAudioHost } from '../../../../media/src/dom/spf-audio';

// Stub — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}

/**
 * @mediaType audio
 * @mediaTarget audio
 */
export class SpfAudioElement extends MediaAttachMixin(CustomMediaElement({ Adapter: SpfAudioHost, host: {} })) {
  static readonly tagName = 'spf-audio';
}
