import { audioFeatures } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: audioFeatures,
});

export class AudioPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'audio-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(AudioPlayerElement);
safeDefine(MediaContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
