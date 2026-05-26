import { PlaybackRateOptionsElement } from '../../ui/playback-rate-menu/playback-rate-options-element';
import { safeDefine } from '../safe-define';
import { defineMenu } from './compounds';

defineMenu();
safeDefine(PlaybackRateOptionsElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateOptionsElement.tagName]: PlaybackRateOptionsElement;
  }
}
