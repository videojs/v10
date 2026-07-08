import { liveVideoFeatures } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: liveVideoFeatures,
});

export class LiveVideoPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'live-video-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(LiveVideoPlayerElement);
safeDefine(MediaContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveVideoPlayerElement.tagName]: LiveVideoPlayerElement;
  }
}
