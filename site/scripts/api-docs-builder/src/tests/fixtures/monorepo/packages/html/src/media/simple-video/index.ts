/**
 * Mock simple media element — mirrors DashVideo.
 *
 * Exercises: standard mixin composition with a simple delegate.
 * The builder follows this import chain to discover the delegate class
 * and resolve its properties.
 */
import { SimpleCustomMedia, SimpleDelegate } from '../../../../core/src/dom/media/simple';

// Stubs — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}
function MediaPropsMixin(base: any, _delegate: any) {
  return base;
}

export class SimpleVideo extends MediaPropsMixin(MediaAttachMixin(SimpleCustomMedia), SimpleDelegate) {}
