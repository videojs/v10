import { createVolumeFeature, videoFeatures, volumeFeature } from '@videojs/core/dom';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { localStorageAdapter } from '../../storage';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const volumeWithStorage = createVolumeFeature(localStorageAdapter);

const { ProviderMixin } = createPlayer({
  features: videoFeatures.map((f) => (f === volumeFeature ? volumeWithStorage : f)) as typeof videoFeatures,
});

export class VideoPlayerElement extends ProviderMixin(MediaElement) {
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
