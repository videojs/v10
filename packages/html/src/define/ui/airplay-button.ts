import { AirplayButtonElement } from '../../ui/airplay-button/airplay-button-element';
import { safeDefine } from '../safe-define';

safeDefine(AirplayButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [AirplayButtonElement.tagName]: AirplayButtonElement;
  }
}
