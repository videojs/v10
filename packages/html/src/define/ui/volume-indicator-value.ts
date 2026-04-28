import { VolumeIndicatorValueElement } from '../../ui/volume-indicator/volume-indicator-value-element';
import { safeDefine } from '../safe-define';

safeDefine(VolumeIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorValueElement.tagName]: VolumeIndicatorValueElement;
  }
}
