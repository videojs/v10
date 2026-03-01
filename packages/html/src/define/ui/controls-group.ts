import { ControlsGroupElement } from '../../ui/controls/controls-group-element';

customElements.define(ControlsGroupElement.tagName, ControlsGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
