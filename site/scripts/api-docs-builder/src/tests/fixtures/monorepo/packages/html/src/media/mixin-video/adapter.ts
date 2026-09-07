/**
 * Mock mixin-chain media element — mirrors MuxVideo / NativeHlsVideo.
 *
 * Exercises: the `createMediaElement` factory with an options object, where the host is a mixin chain whose target
 * is inherited from the base host.
 */
import { MixinHost } from '../../../../media/src/dom/mixin';

// Stub — the builder parses the AST, it doesn't run the code.
function createMediaElement(host: any, options?: { template?: (attrs: Record<string, string>) => string }) {
  return host;
}

export class MixinVideo extends createMediaElement(MixinHost, { template: () => '<video></video>' }) {}
