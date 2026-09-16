/**
 * Shaka's UMD bundle reads the browser global `self` while it evaluates, so importing it on a server runtime throws
 * before any feature detection can run. Evaluated ahead of `shaka-player` — keep it the first import of `media.ts` —
 * this lends that evaluation a `self`, and `media.ts` takes it back as soon as shaka is through: a patched server
 * global left behind would only confuse other libraries' environment detection.
 */
export const didShimSelf = typeof self === 'undefined';

if (didShimSelf) {
  (globalThis as { self?: typeof globalThis }).self = globalThis;
}
