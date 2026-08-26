import { safeDefine } from '../../registration/safe-define';
import { CaptionsRadioGroupElement } from '../../ui/captions-radio-group/captions-radio-group-element';

safeDefine(CaptionsRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [CaptionsRadioGroupElement.tagName]: CaptionsRadioGroupElement;
  }
}
