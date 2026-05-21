import { CaptionsMenuCore, CaptionsMenuDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MenuElement } from '../menu/menu-element';
import { syncSectionLabelParts } from '../menu/sync-section-label-parts';

export class CaptionsMenuElement extends MenuElement {
  static override readonly tagName = 'media-captions-menu';

  static override properties = {
    ...MenuElement.properties,
    label: { type: String },
    offLabel: { type: String, attribute: 'off-label' },
    menuSectionLabel: { type: String, attribute: 'menu-section-label' },
    disabled: { type: Boolean },
  } satisfies PropertyDeclarationMap<
    | 'open'
    | 'defaultOpen'
    | 'side'
    | 'align'
    | 'closeOnEscape'
    | 'closeOnOutsideClick'
    | 'boundary'
    | 'label'
    | 'offLabel'
    | 'menuSectionLabel'
    | 'disabled'
  >;

  label = '';
  offLabel = CaptionsMenuCore.defaultProps.offLabel;
  menuSectionLabel = CaptionsMenuCore.defaultProps.menuSectionLabel;
  disabled = false;
  override align: MenuElement['align'] = 'center';
  formatTrack = CaptionsMenuCore.defaultProps.formatTrack;

  readonly #core = new CaptionsMenuCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectTextTrack);

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.#core.setProps(this);
    this.#core.setMedia(media);
    const state = this.#core.getState();

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, CaptionsMenuDataAttrs);
    syncSectionLabelParts(this, this.#core.getMenuSectionLabel());
  }
}

export namespace CaptionsMenuElement {
  export type State = CaptionsMenuCore.State;
}
