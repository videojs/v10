import { PipButtonElement } from '../../ui/pip-button/pip-button-element';

customElements.define(PipButtonElement.tagName, PipButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PipButtonElement.tagName]: PipButtonElement;
  }
}
