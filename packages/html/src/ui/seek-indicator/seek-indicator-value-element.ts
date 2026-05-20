import { MediaElement } from '../media-element';

/** Custom element shell for the `<media-seek-indicator-value>` tag — rendered scrub time inside `<media-seek-indicator>`. */
export class SeekIndicatorValueElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-seek-indicator-value';
}
