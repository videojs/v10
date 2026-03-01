import { ControlsElement } from '../../ui/controls/controls-element';

import './controls-group';

customElements.define(ControlsElement.tagName, ControlsElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
  }
}
