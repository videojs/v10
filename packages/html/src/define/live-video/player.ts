import { liveVideoFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
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
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveVideoPlayerElement.tagName]: LiveVideoPlayerElement;
  }
}
