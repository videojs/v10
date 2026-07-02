import type { InferComponentState, InferMediaState, MediaUIComponent, StateAttrMap } from '@videojs/core';
import { resolveControlAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { isFunction } from '@videojs/utils/predicate';

import { i18nContext } from '../i18n/context';
import { I18nController } from '../i18n/controller';
import type { PlayerController } from '../player/player-controller';
import { MediaElement } from './media-element';

/** Abstract base for HTML custom elements that display media state with data attributes. */
export abstract class MediaUIElement<Core extends MediaUIComponent> extends MediaElement {
  readonly #i18n = new I18nController(this, i18nContext);

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

    this.core.setMedia(media);
    const state = this.core.getState();
    if (isFunction(this.core.getAttrs)) {
      applyElementProps(this, resolveControlAttrs(this.#i18n.value, this.core, state));
    }
    applyStateDataAttrs(this, state, this.stateAttrMap);
  }
}
