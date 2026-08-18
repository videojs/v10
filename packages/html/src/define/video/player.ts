import { videoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { safeDefine } from '../safe-define';

const { PlayerElement, PlayerController: ConfiguredPlayerController } = createPlayer({
  features: videoFeatures,
});

/** Player controller bound to the standard video player store. */
export const PlayerController = ConfiguredPlayerController;

export class VideoPlayerElement extends PlayerElement {
  static readonly tagName = 'video-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(VideoPlayerElement);
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
