/**
 * Mock simple media element — mirrors DashVideo.
 *
 * Exercises: standard composition with CustomMediaElement factory.
 * The builder follows this import chain to discover the host class
 * and resolve its properties.
 */
import { CustomMediaElement } from '../../../../core/src/dom/media/custom-media-element';
import { SimpleHost } from '../../../../core/src/dom/media/simple';

// Stub — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}

export class SimpleVideo extends MediaAttachMixin(CustomMediaElement('video', SimpleHost)) {}
