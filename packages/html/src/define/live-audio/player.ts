import { liveAudioFeatures } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: liveAudioFeatures,
});

export class LiveAudioPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'live-audio-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(LiveAudioPlayerElement);
safeDefine(MediaContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioPlayerElement.tagName]: LiveAudioPlayerElement;
  }
}
