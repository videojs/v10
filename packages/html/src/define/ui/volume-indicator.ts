import { VolumeIndicatorElement } from '../../ui/volume-indicator/volume-indicator-element';
import { VolumeIndicatorFillElement } from '../../ui/volume-indicator/volume-indicator-fill-element';
import { VolumeIndicatorValueElement } from '../../ui/volume-indicator/volume-indicator-value-element';
import { safeDefine } from '../safe-define';

safeDefine(VolumeIndicatorElement);
safeDefine(VolumeIndicatorFillElement);
safeDefine(VolumeIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeIndicatorElement.tagName]: VolumeIndicatorElement;
    [VolumeIndicatorFillElement.tagName]: VolumeIndicatorFillElement;
    [VolumeIndicatorValueElement.tagName]: VolumeIndicatorValueElement;
  }
}
