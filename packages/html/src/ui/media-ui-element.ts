import type { InferComponentState, InferMediaState, MediaUIComponent, StateAttrMap } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { isString } from '@videojs/utils/predicate';

import { I18nController } from '../i18n/instance';
import { translateAriaLabelAttrs } from '../i18n/translate-control-label';
import type { PlayerController } from '../player/player-controller';
import { MediaElement } from './media-element';

/** Abstract base for HTML custom elements that display media state with data attributes. */
export abstract class MediaUIElement<Core extends MediaUIComponent> extends MediaElement {
  readonly #i18n = new I18nController(this);

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
    const attrs = this.core.getAttrs?.(state);
    if (attrs) {
      const ariaLabel = 'aria-label' in attrs ? attrs['aria-label'] : undefined;
      applyElementProps(
        this,
        isString(ariaLabel) && ariaLabel ? translateAriaLabelAttrs(this.#i18n.value, attrs, ariaLabel) : attrs
      );
    }
    applyStateDataAttrs(this, state, this.stateAttrMap);
  }
}
