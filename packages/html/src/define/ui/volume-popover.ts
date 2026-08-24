import { VolumePopoverElement } from '../../ui/volume-popover/volume-popover-element';
import { safeDefine } from '../safe-define';

safeDefine(VolumePopoverElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumePopoverElement.tagName]: VolumePopoverElement;
  }
}
