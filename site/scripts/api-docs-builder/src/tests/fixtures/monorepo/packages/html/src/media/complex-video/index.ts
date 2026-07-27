/**
 * Mock complex media element — mirrors HlsVideo.
 *
 * Exercises: standard composition with CustomMediaElement factory
 * and a complex host that has JSDoc descriptions on its getter/setters.
 */

import { ComplexHost } from '../../../../media/src/dom/complex';
import { CustomMediaElement } from '../../../../media/src/dom/custom-media-element';

// Stub — the builder parses the AST, it doesn't run the code.
function MediaAttachMixin(base: any) {
  return base;
}

export class ComplexVideo extends MediaAttachMixin(CustomMediaElement('video', ComplexHost)) {}
