import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';

customElements.define(BufferingIndicatorElement.tagName, BufferingIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [BufferingIndicatorElement.tagName]: BufferingIndicatorElement;
  }
}
