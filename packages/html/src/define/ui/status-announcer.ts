import { safeDefine } from '../../registration/safe-define';
import { StatusAnnouncerElement } from '../../ui/status-announcer/element';

safeDefine(StatusAnnouncerElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusAnnouncerElement.tagName]: StatusAnnouncerElement;
  }
}
