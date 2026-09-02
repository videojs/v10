/**
 * Mock mixin-chain media element — mirrors MuxVideo / NativeHlsVideo.
 *
 * Exercises: the `createMediaElement` factory with an options object naming the target, where the host is a mixin
 * chain.
 */
import { MixinHost } from '../../../../media/src/dom/mixin';

// Stub — the builder parses the AST, it doesn't run the code.
function createMediaElement(host: any, options?: { tag?: string }) {
  return host;
}

export class MixinVideo extends createMediaElement(MixinHost, { tag: 'video' }) {}
