/**
 * Mock simple media element — mirrors DashVideo.
 *
 * Exercises: composition through the `createMediaElement` factory, which wraps
 * `CustomMediaElement` in `MediaAttachMixin`. The builder follows the factory
 * call to discover the host class and resolve its properties.
 */
import { SimpleHost } from '../../../../media/src/dom/simple';

// Stub — the builder parses the AST, it doesn't run the code.
function createMediaElement(adapter: any, options?: { template?: (attrs: Record<string, string>) => string }) {
  return adapter;
}

export class SimpleVideoElement extends createMediaElement(SimpleHost) {
  static readonly tagName = 'simple-video';
}
