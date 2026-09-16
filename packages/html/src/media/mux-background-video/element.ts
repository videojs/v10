import { HlsBackgroundVideoElement } from '../hls-background-video';

/**
 * `<mux-background-video>` — the Mux-flavored name for `<hls-background-video>`. Kept because it is what the standalone
 * package this element replaces was called.
 *
 * A subclass rather than a re-export because a custom-element class can hold one tag name: registering the same class
 * twice throws. The behavior is entirely the shared base's. There is no Mux identity to add, because there is no Mux
 * input to take: `src` is an HLS URL, and capping which rendition is fetched is a param on it rather than an
 * attribute.
 */
// The base's `tagName` is a literal type, which a subclass cannot widen; the cast drops it from the static side.
type HlsBackgroundVideoBase = Omit<typeof HlsBackgroundVideoElement, 'tagName'> & (new () => HlsBackgroundVideoElement);

export class MuxBackgroundVideoElement extends (HlsBackgroundVideoElement as HlsBackgroundVideoBase) {
  static readonly tagName = 'mux-background-video';
}
