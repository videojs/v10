import { safeDefine } from '../../registration/safe-define';
import { VolumePopoverElement } from '../../ui/volume-popover/volume-popover-element';

safeDefine(VolumePopoverElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumePopoverElement.tagName]: VolumePopoverElement;
  }
}
