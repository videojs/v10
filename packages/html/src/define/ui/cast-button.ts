import { CastButtonElement } from '../../ui/cast-button/cast-button-element';
import { safeDefine } from '../safe-define';

safeDefine(CastButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [CastButtonElement.tagName]: CastButtonElement;
  }
}
