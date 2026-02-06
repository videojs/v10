import { MediaElement } from '../media-element';

export class TimeSeparatorElement extends MediaElement {
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
