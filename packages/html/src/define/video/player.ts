import { videoFeatures } from '@videojs/core/dom';
import { I18nProviderMixin } from '../../i18n/provider-instance';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin: StoreProviderMixin } = createPlayer({
  features: videoFeatures,
});

export class VideoPlayerElement extends I18nProviderMixin(StoreProviderMixin(MediaElement)) {
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
