import { MuxBackgroundVideo } from './index';

/**
 * `<mux-background-video>` — the Mux-flavored tag for `<hls-background-video>`.
 *
 * A distinct subclass rather than a re-export because a custom-element class can hold one tag name: registering the
 * same class twice throws. The behavior is entirely the shared base's.
 */
export class MuxBackgroundVideoElement extends MuxBackgroundVideo {
  static readonly tagName = 'mux-background-video';
}
