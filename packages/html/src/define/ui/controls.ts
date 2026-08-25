import { ControlsBackdropElement } from '../../ui/controls/controls-backdrop-element';
import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';
import { defineControls } from './compounds';

defineControls();

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
    [ControlsBackdropElement.tagName]: ControlsBackdropElement;
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
