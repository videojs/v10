/**
 * Mock flavour element — mirrors media/mux-video/hls-js.ts.
 *
 * Exercises: an element reached through a nested define barrel (`define/media/barrel-video/index.ts` → `./hls-js`).
 */
import { SimpleHost } from '../../../../media/src/dom/simple';

// Stub — the builder parses the AST, it doesn't run the code.
function createMediaElement(options: { adapter: { constructor: any }; target: any }) {
  return options.adapter.constructor;
}

/**
 * @mediaType video
 * @mediaTarget video
 */
export class BarrelVideoElement extends createMediaElement({ adapter: { constructor: SimpleHost }, target: {} }) {
  static readonly tagName = 'barrel-video';
}
