import { videoFeatures } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { UIElement } from '../../ui/ui-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: videoFeatures,
});

export class VideoPlayerElement extends ProviderMixin(UIElement) {
  static readonly tagName = 'video-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(VideoPlayerElement);
safeDefine(MediaContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
