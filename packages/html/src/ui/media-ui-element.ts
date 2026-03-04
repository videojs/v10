import type { InferComponentState, InferMediaState, StateAttrMap, UICore } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import type { PlayerController } from '../player/player-controller';
import { MediaElement } from './media-element';

export abstract class MediaUIElement<Core extends UICore> extends MediaElement {
  protected abstract readonly core: Core;
  protected abstract readonly stateAttrMap: StateAttrMap<InferComponentState<Core>>;
  protected abstract readonly mediaState: PlayerController<any, InferMediaState<Core> | undefined>;

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && !this.mediaState.value && this.mediaState.featureName) {
      logMissingFeature(this.localName, this.mediaState.featureName);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.mediaState.value;

    if (!media) return;

    const state = this.core.getState(media as never);
    applyStateDataAttrs(this, state, this.stateAttrMap as StateAttrMap<object>);
  }
}
