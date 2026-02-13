import { PiPButtonElement } from '../../ui/pip-button/pip-button-element';

customElements.define(PiPButtonElement.tagName, PiPButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PiPButtonElement.tagName]: PiPButtonElement;
  }
}
