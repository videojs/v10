import { CaptionsButtonElement } from '../../ui/captions-button/captions-button-element';

customElements.define(CaptionsButtonElement.tagName, CaptionsButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [CaptionsButtonElement.tagName]: CaptionsButtonElement;
  }
}
