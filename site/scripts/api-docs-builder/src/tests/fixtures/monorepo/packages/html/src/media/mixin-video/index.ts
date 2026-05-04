/**
 * Mock mixin-chain media element — mirrors MuxVideo / NativeHlsVideo.
 *
 * Exercises: standard composition where the host is a mixin chain.
 */
import { CustomMediaElement } from '../../../../core/src/dom/media/custom-media-element';
import { MixinHost } from '../../../../core/src/dom/media/mixin';

// Stub — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}

export class MixinVideo extends MediaAttachMixin(CustomMediaElement('video', MixinHost)) {}
