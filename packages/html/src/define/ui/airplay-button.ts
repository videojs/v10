import { safeDefine } from '../../registration/safe-define';
import { AirPlayButtonElement } from '../../ui/airplay-button/airplay-button-element';

safeDefine(AirPlayButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [AirPlayButtonElement.tagName]: AirPlayButtonElement;
  }
}
