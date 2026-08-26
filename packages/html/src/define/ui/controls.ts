import { defineControls } from '../../registration/ui-compounds';
import { ControlsBackdropElement } from '../../ui/controls/controls-backdrop-element';
import { ControlsContentElement } from '../../ui/controls/controls-content-element';
import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';

defineControls();

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
    [ControlsBackdropElement.tagName]: ControlsBackdropElement;
    [ControlsContentElement.tagName]: ControlsContentElement;
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
