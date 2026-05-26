import { liveAudioFeatures } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { MediaContainerElement } from '../../media/container-element';
import { createPlayer } from '../../player/create-player';
import { MediaElement } from '../../ui/media-element';
import { safeDefine } from '../safe-define';

const { ProviderMixin } = createPlayer({
  features: liveAudioFeatures,
});

export class LiveAudioPlayerElement extends ProviderMixin(MediaElement) {
  static readonly tagName = 'live-audio-player';

  static override properties = {
    mediaTitle: { type: String, attribute: 'media-title' },
  } satisfies PropertyDeclarationMap;

  mediaTitle: string | null = null;

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const state = this.store.state as { setTitle?: (t: string | null) => void };
    state.setTitle?.(this.mediaTitle);
  }
}

// Provider must be defined before consumer for context handshake during upgrade.
safeDefine(LiveAudioPlayerElement);
safeDefine(MediaContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [LiveAudioPlayerElement.tagName]: LiveAudioPlayerElement;
  }
}
