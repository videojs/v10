import { backgroundFeatures } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: backgroundFeatures,
});

/** Custom element shell for the `<background-video-player>` tag — provides the player context and store. */
export class BackgroundVideoPlayerElement extends ProviderMixin(MediaElement) {
  /** Custom element tag name. */
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
