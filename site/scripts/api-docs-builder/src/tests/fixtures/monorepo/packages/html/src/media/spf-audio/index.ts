/**
 * Mock audio-only media element — mirrors SimpleHlsAudioOnly.
 *
 * Exercises: audio media type ('audio' tag argument) with a cross-package
 * mixin host.
 */
import { CustomMediaElement } from '../../../../core/src/dom/media/custom-media-element';
import { SpfAudioHost } from '../../../../core/src/dom/media/spf-audio';

// Stub — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}

export class SpfAudio extends MediaAttachMixin(CustomMediaElement('audio', SpfAudioHost)) {}
