import { CaptionsMenuElement } from '../../ui/captions-menu/captions-menu-element';
import { CaptionsMenuTriggerElement } from '../../ui/captions-menu/captions-menu-trigger-element';
import { CaptionsOptionsElement } from '../../ui/captions-menu/captions-options-element';
import { safeDefine } from '../safe-define';
import { defineMenu } from './compounds';

defineMenu();
safeDefine(CaptionsOptionsElement);
safeDefine(CaptionsMenuTriggerElement);
safeDefine(CaptionsMenuElement);

declare global {
  interface HTMLElementTagNameMap {
    [CaptionsMenuElement.tagName]: CaptionsMenuElement;
    [CaptionsMenuTriggerElement.tagName]: CaptionsMenuTriggerElement;
    [CaptionsOptionsElement.tagName]: CaptionsOptionsElement;
  }
}
