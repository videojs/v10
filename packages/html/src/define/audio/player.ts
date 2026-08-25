import { audioFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { UIElement } from '../../ui/ui-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: audioFeatures,
});

export class AudioPlayerElement extends ProviderMixin(UIElement) {
  static readonly tagName = 'audio-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(AudioPlayerElement);
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [AudioPlayerElement.tagName]: AudioPlayerElement;
  }
}
