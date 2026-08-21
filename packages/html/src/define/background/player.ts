import { backgroundFeatures } from '@videojs/core/dom';
import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: backgroundFeatures,
});

export class BackgroundVideoPlayerElement extends ProviderMixin(MediaElement) {
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
