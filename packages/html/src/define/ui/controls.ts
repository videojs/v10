import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';

customElements.define(ControlsElement.tagName, ControlsElement);
customElements.define(ControlsGroupElement.tagName, ControlsGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
