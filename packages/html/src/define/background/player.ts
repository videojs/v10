import { backgroundFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { safeDefine } from '../safe-define';

const { PlayerElement, PlayerController: ConfiguredPlayerController } = createPlayer({
  features: backgroundFeatures,
});

/** Player controller bound to the background video player store. */
export const PlayerController = ConfiguredPlayerController;

export class BackgroundVideoPlayerElement extends PlayerElement {
  static readonly tagName = 'background-video-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(BackgroundVideoPlayerElement);
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
