import { safeDefine } from '../../registration/safe-define';
import { CastButtonElement } from '../../ui/cast-button/cast-button-element';

safeDefine(CastButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [CastButtonElement.tagName]: CastButtonElement;
  }
}
