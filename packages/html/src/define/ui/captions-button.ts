import { CaptionsButtonElement } from '../../ui/captions-button/captions-button-element';
import { safeDefine } from '../safe-define';

safeDefine(CaptionsButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [CaptionsButtonElement.tagName]: CaptionsButtonElement;
  }
}
