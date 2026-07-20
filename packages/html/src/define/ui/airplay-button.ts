import { AirPlayButtonElement } from '../../ui/airplay-button/airplay-button-element';
import { safeDefine } from '../safe-define';

safeDefine(AirPlayButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [AirPlayButtonElement.tagName]: AirPlayButtonElement;
  }
}
