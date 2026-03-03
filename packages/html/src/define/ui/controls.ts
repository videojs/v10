import { ControlsElement } from '../../ui/controls/controls-element';

export { ControlsGroupElement } from './controls-group';

customElements.define(ControlsElement.tagName, ControlsElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
  }
}
