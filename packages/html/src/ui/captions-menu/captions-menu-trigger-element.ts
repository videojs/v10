import { CaptionsMenuCore, CaptionsMenuDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';
import { SubmenuTriggerController } from '../menu/submenu-trigger-controller';
import { updateMediaMenuSectionTrigger } from '../menu/update-media-menu-section-trigger';

export class CaptionsMenuTriggerElement extends MediaElement {
  static readonly tagName = 'media-captions-menu-trigger';

  static override properties = {
    label: { type: String },
    offLabel: { type: String, attribute: 'off-label' },
    menuSectionLabel: { type: String, attribute: 'menu-section-label' },
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'label' | 'offLabel' | 'menuSectionLabel' | 'disabled' | 'commandfor'>;

  label = '';
  offLabel = CaptionsMenuCore.defaultProps.offLabel;
  menuSectionLabel = CaptionsMenuCore.defaultProps.menuSectionLabel;
  disabled = false;
  commandfor: string | undefined = undefined;
  formatTrack = CaptionsMenuCore.defaultProps.formatTrack;

  readonly #core = new CaptionsMenuCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectTextTrack);
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
      submenuRegistrationActive: (submenuAttrsPresent) => submenuAttrsPresent && state.availability === 'available',
      standaloneButtonExtras: () => ({ hidden: undefined }),
      submenuOpenExtras: (s) => ({ hidden: s.availability !== 'available' }),
      syncVisibleLabel: () => this.#syncLabel(state),
      getMenuSectionLabel: () => this.#core.getMenuSectionLabel(),
    });

    applyStateDataAttrs(this, state, CaptionsMenuDataAttrs);
  }

  #syncLabel(state: CaptionsMenuCore.State): void {
    const labelPart = this.querySelector<HTMLElement>('[data-part~="label"]');

    if (!labelPart) return;

    const selectedTrack = this.#core.getSelectedTrack(state);
    labelPart.textContent = selectedTrack ? this.#core.getTrackLabel(selectedTrack) : this.#core.getOffLabel();
  }
}

export namespace CaptionsMenuTriggerElement {
  export type State = CaptionsMenuCore.State;
}
