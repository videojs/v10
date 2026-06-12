import { createVolumeFeature, liveVideoFeatures, volumeFeature } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { localStorageAdapter } from '../../storage';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const volumeWithStorage = createVolumeFeature(localStorageAdapter);

const { ProviderMixin } = createPlayer({
  features: liveVideoFeatures.map((f) => (f === volumeFeature ? volumeWithStorage : f)) as typeof liveVideoFeatures,
});

export class LiveVideoPlayerElement extends ProviderMixin(MediaElement) {
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
