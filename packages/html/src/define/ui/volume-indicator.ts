import { safeDefine } from '../../registration/safe-define';
import { VolumeIndicatorElement } from '../../ui/volume-indicator/volume-indicator-element';

safeDefine(VolumeIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorElement.tagName]: VolumeIndicatorElement;
  }
}
