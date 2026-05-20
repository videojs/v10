import { MediaElement } from '../media-element';

/** Custom element shell for the `<media-time-separator>` tag — visual divider between two `<media-time>` elements (default text: `"/"`). */
export class TimeSeparatorElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-time-separator';

  override connectedCallback(): void {
    super.connectedCallback();

    // Set aria-hidden for accessibility
    this.setAttribute('aria-hidden', 'true');

    // Set default content if empty
    if (!this.textContent?.trim()) {
      this.textContent = '/';
    }
  }
}
