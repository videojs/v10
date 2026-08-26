import { safeDefine } from '../../registration/safe-define';
import { VolumeIndicatorValueElement } from '../../ui/volume-indicator/volume-indicator-value-element';

safeDefine(VolumeIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorValueElement.tagName]: VolumeIndicatorValueElement;
  }
}
