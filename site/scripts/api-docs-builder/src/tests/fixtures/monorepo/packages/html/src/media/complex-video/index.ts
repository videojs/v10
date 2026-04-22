/**
 * Mock complex media element — mirrors HlsVideo.
 *
 * Exercises: standard composition with CustomMediaElement factory
 * and a complex host that has JSDoc descriptions on its getter/setters.
 */

import { ComplexHost } from '../../../../core/src/dom/media/complex';
import { CustomMediaElement } from '../../../../core/src/dom/media/custom-media-element';

// Stub — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}

export class ComplexVideo extends MediaAttachMixin(CustomMediaElement('video', ComplexHost)) {}
