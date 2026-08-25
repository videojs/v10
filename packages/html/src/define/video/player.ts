import { videoFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
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
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [VideoPlayerElement.tagName]: VideoPlayerElement;
  }
}
