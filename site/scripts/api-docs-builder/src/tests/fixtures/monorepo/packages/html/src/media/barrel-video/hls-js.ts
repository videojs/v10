/**
 * Mock flavour element — mirrors media/mux-video/hls-js.ts.
 *
 * Exercises: an element reached through a nested define barrel (`define/media/barrel-video/index.ts` → `./hls-js`).
 */
import { SimpleHost } from '../../../../media/src/dom/simple';

// Stub — the builder parses the AST, it doesn't run the code.
function createMediaElement(adapter: any, options?: { template?: (attrs: Record<string, string>) => string }) {
  return adapter;
}

export class BarrelVideoElement extends createMediaElement(SimpleHost) {
  static readonly tagName = 'barrel-video';
}
