import { PlaybackRateMenuElement } from '../../ui/playback-rate-menu/playback-rate-menu-element';
import { PlaybackRateMenuTriggerElement } from '../../ui/playback-rate-menu/playback-rate-menu-trigger-element';
import { PlaybackRateOptionsElement } from '../../ui/playback-rate-menu/playback-rate-options-element';
import { safeDefine } from '../safe-define';
import { defineMenu } from './compounds';

defineMenu();
safeDefine(PlaybackRateOptionsElement);
safeDefine(PlaybackRateMenuTriggerElement);
safeDefine(PlaybackRateMenuElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlaybackRateMenuElement.tagName]: PlaybackRateMenuElement;
    [PlaybackRateMenuTriggerElement.tagName]: PlaybackRateMenuTriggerElement;
    [PlaybackRateOptionsElement.tagName]: PlaybackRateOptionsElement;
  }
}
