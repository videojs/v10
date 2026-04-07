/**
 * Mock complex media element — mirrors HlsVideo.
 *
 * Exercises: standard mixin composition with a complex delegate
 * that has JSDoc descriptions on its getter/setters.
 */
import { ComplexCustomMedia, ComplexDelegate } from '../../../../core/src/dom/media/complex';

// Stubs — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}
function MediaPropsMixin(base: any, _delegate: any) {
  return base;
}

export class ComplexVideo extends MediaPropsMixin(MediaAttachMixin(ComplexCustomMedia), ComplexDelegate) {}
