import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';
import { defineControls } from './compounds';

defineControls();

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
