import { MediaElement } from '../media-element';

export class ControlsGroupElement extends MediaElement {
  static readonly tagName = 'media-controls-group';

  override connectedCallback(): void {
    super.connectedCallback();

    if (this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')) {
      this.setAttribute('role', 'group');
    }
  }
}
