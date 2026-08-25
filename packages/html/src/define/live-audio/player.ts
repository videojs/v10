import { liveAudioFeatures } from '@videojs/core/dom';

import { createPlayer } from '../../player/create-player';
import { ContainerElement } from '../../ui/container/container-element';
import { UIElement } from '../../ui/ui-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: liveAudioFeatures,
});

export class LiveAudioPlayerElement extends ProviderMixin(UIElement) {
  static readonly tagName = 'live-audio-player';
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(LiveAudioPlayerElement);
safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioPlayerElement.tagName]: LiveAudioPlayerElement;
  }
}
