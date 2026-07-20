import type { InferComponentState, InferMediaState, MediaUIComponent, StateAttrMap } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature } from '@videojs/core/dom';
import { resolveTranslation } from '@videojs/core/i18n';
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
      const attrs = this.core.getAttrs(state) as Record<string, unknown>;
      if (typeof attrs['aria-label'] === 'string') {
        attrs['aria-label'] = resolveTranslation(this.#i18n.value, attrs['aria-label']);
      }
      applyElementProps(this, attrs);
    }
    applyStateDataAttrs(this, state, this.stateAttrMap);
  }
}
