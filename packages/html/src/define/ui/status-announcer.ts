import { StatusAnnouncerElement } from '../../ui/status-announcer/status-announcer-element';
import { safeDefine } from '../safe-define';

safeDefine(StatusAnnouncerElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusAnnouncerElement.tagName]: StatusAnnouncerElement;
  }
}
