import { CaptionsRadioGroupElement } from '../../ui/captions-radio-group/captions-radio-group-element';
import { safeDefine } from '../safe-define';

safeDefine(CaptionsRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [CaptionsRadioGroupElement.tagName]: CaptionsRadioGroupElement;
  }
}
