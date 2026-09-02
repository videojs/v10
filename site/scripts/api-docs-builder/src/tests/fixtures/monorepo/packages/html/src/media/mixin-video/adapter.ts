/**
 * Mock mixin-chain media element — mirrors MuxVideo / NativeHlsVideo.
 *
 * Exercises: standard composition where the host is a mixin chain.
 */
import { CustomMediaElement } from '../../../../media/src/dom/custom-media-element';
import { MixinHost } from '../../../../media/src/dom/mixin';

// Stub — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}

export class MixinVideo extends MediaAttachMixin(CustomMediaElement('video', MixinHost)) {}
