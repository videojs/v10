import { PlaybackRateMenuCore, PlaybackRateMenuDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { SubmenuTriggerController } from '../menu/submenu-trigger-controller';
import { updateMediaMenuSectionTrigger } from '../menu/update-media-menu-section-trigger';

export class PlaybackRateMenuTriggerElement extends MediaElement {
  static readonly tagName = 'media-playback-rate-menu-trigger';

  static override properties = {
    label: { type: String },
    menuSectionLabel: { type: String, attribute: 'menu-section-label' },
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'label' | 'menuSectionLabel' | 'disabled' | 'commandfor'>;

  label = '';
  menuSectionLabel = PlaybackRateMenuCore.defaultProps.menuSectionLabel;
  disabled = false;
  commandfor: string | undefined = undefined;
  formatRate = PlaybackRateMenuCore.defaultProps.formatRate;

  readonly #core = new PlaybackRateMenuCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectPlaybackRate);
  readonly #submenuTrigger = new SubmenuTriggerController(this, {
    isDisabled: () => !this.#mediaState.value || this.#core.state.current.disabled,
  });

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    this.#submenuTrigger.connect(this.#disconnect.signal);

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#submenuTrigger.cleanupRegistration();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  /** Returns the trigger's current label derived from media state. */
  getLabel(): string | undefined {
    return this.#core.state.current.label || undefined;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.#core.setProps(this);
    this.#core.setMedia(media);
    const state = this.#core.getState();

    updateMediaMenuSectionTrigger({
      host: this,
      state,
      submenuTrigger: this.#submenuTrigger,
      getCoreAttrs: (s) => this.#core.getAttrs(s),
      submenuRegistrationActive: (submenuAttrsPresent) => submenuAttrsPresent,
      syncVisibleLabel: () => this.#syncLabel(this.#core.getRateLabel(state.rate)),
      getMenuSectionLabel: () => this.#core.getMenuSectionLabel(),
    });

    applyStateDataAttrs(this, state, PlaybackRateMenuDataAttrs);
  }

  #syncLabel(label: string): void {
    const labelPart = this.querySelector<HTMLElement>('[data-part~="label"]');

    if (labelPart) labelPart.textContent = label;
  }
}

export namespace PlaybackRateMenuTriggerElement {
  export type State = PlaybackRateMenuCore.State;
}
