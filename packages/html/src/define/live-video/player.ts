import { liveVideoFeatures } from '@videojs/core/dom';
import { I18nProviderMixin } from '../../i18n/instance';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin: StoreProviderMixin } = createPlayer({
  features: liveVideoFeatures,
});

export class LiveVideoPlayerElement extends I18nProviderMixin(StoreProviderMixin(MediaElement)) {
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
