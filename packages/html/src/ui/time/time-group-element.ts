import { MediaElement } from '../media-element';

/** Custom element shell for the `<media-time-group>` tag — visual grouping for related `<media-time>` and `<media-time-separator>` elements. */
export class TimeGroupElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-time-group';

  // Future: Could provide context for hoursDisplay to children via Lit context
}
