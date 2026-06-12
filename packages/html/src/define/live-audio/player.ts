import { createVolumeFeature, liveAudioFeatures, volumeFeature } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { localStorageAdapter } from '../../storage';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const volumeWithStorage = createVolumeFeature(localStorageAdapter);

const { ProviderMixin } = createPlayer({
  features: liveAudioFeatures.map((f) => (f === volumeFeature ? volumeWithStorage : f)) as typeof liveAudioFeatures,
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
