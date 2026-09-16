import { safeDefine } from '../../registration/safe-define';
import { VolumeIndicatorValueElement } from '../../ui/volume-indicator/value';

safeDefine(VolumeIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorValueElement.tagName]: VolumeIndicatorValueElement;
  }
}
