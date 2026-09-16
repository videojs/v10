import { safeDefine } from '../../registration/safe-define';
import { VolumeIndicatorFillElement } from '../../ui/volume-indicator/fill';

safeDefine(VolumeIndicatorFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorFillElement.tagName]: VolumeIndicatorFillElement;
  }
}
