/**
 * Mock mixin-chain media element — mirrors MuxVideo / NativeHlsVideo.
 *
 * Exercises: the `createMediaElement` factory with an options object, where the host is a mixin chain whose target
 * is inherited from the base host.
 */
import { MixinHost } from '../../../../media/src/dom/mixin';

// Stub — the builder parses the AST, it doesn't run the code.
function createMediaElement(options: { adapter: { constructor: any }; target: any }) {
  return options.adapter.constructor;
}

/**
 * @mediaType video
 * @mediaTarget video
 */
export class MixinVideoElement extends createMediaElement({
  adapter: { constructor: MixinHost },
  target: { template: () => '<video></video>' },
}) {
  static readonly tagName = 'mixin-video';
}
