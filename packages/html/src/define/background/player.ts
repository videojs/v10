import { backgroundFeatures } from '@videojs/core/dom';
import { I18nProviderMixin } from '../../i18n/instance';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin: StoreProviderMixin } = createPlayer({
  features: backgroundFeatures,
});

export class BackgroundVideoPlayerElement extends I18nProviderMixin(StoreProviderMixin(MediaElement)) {
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
