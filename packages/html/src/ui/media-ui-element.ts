import type { InferComponentState, InferMediaState, MediaUIComponent, StateAttrMap } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import type { PlayerController } from '../player/player-controller';
import { MediaElement } from './media-element';

/** Abstract base for HTML custom elements that display media state with data attributes. */
export abstract class MediaUIElement<Core extends MediaUIComponent> extends MediaElement {
  protected abstract readonly core: Core;
  protected abstract readonly stateAttrMap: StateAttrMap<InferComponentState<Core>>;
  protected abstract readonly mediaState: PlayerController<any, InferMediaState<Core> | undefined>;

  override connectedCallback(): void {
    super.connectedCallback();

    if (__DEV__ && !this.mediaState.value && this.mediaState.displayName) {
      logMissingFeature(this.localName, this.mediaState.displayName);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.mediaState.value;

    if (!media) return;

    this.core.setMedia(media as never);
    const state = this.core.getState();
    applyStateDataAttrs(this, state, this.stateAttrMap as StateAttrMap<object>);
  }
}
