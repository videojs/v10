import { backgroundFeatures } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { UIElement } from '../../ui/ui-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: backgroundFeatures,
});

export class BackgroundVideoPlayerElement extends ProviderMixin(UIElement) {
  static readonly tagName = 'background-video-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(BackgroundVideoPlayerElement);
safeDefine(MediaContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [BackgroundVideoPlayerElement.tagName]: BackgroundVideoPlayerElement;
  }
}
