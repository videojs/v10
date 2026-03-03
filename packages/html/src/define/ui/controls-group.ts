import { ControlsGroupElement } from '../../ui/controls/controls-group-element';

export { ControlsGroupElement };

customElements.define(ControlsGroupElement.tagName, ControlsGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
