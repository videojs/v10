import { safeDefine } from '../../registration/safe-define';
import { CaptionsButtonElement } from '../../ui/captions-button/captions-button-element';

safeDefine(CaptionsButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [CaptionsButtonElement.tagName]: CaptionsButtonElement;
  }
}
