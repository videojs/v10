import { PlaceholderElement } from '../../ui/placeholder/placeholder-element';
import { safeDefine } from '../safe-define';

safeDefine(PlaceholderElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaceholderElement.tagName]: PlaceholderElement;
  }
}
