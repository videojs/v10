import { videoFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';

const { PlayerElement, PlayerController: VideoPlayerController } = createPlayer({
  features: videoFeatures,
});

/** Player controller bound to the standard video player store. */
export const PlayerController = VideoPlayerController;

/**
 * Player-state provider registered as `<video-player>`.
 *
 * The element owns the configured video store but no layout. Put a skin or `<media-container>` inside it to provide the
 * media, controls, and fullscreen target.
 */
export class VideoPlayerElement extends PlayerElement {
  static readonly tagName = 'video-player';
}

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
