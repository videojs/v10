import { VolumePopoverCore, VolumePopoverStateDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, selectVolume } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import type { MediaVolumeState } from '@videojs/media';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { PopoverElement } from '../popover/popover-element';

const unavailableVolume: MediaVolumeState = {
  volume: 0,
  muted: false,
  volumeAvailability: 'unsupported',
  mutedAvailability: 'unsupported',
  setVolume: () => 0,
  toggleMuted: () => false,
};

/** A volume-aware popover that keeps its adjacent mute trigger available as a fallback. */
export class VolumePopoverElement extends PopoverElement {
  static override readonly tagName = 'media-volume-popover';

  readonly #core = new VolumePopoverCore();
  readonly #volume = new PlayerController(this, playerContext, selectVolume);

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    this.#core.setProps(this);
    this.#core.setInput({
      active: this.hasAttribute('data-open'),
      status: this.hasAttribute('data-starting-style')
        ? 'starting'
        : this.hasAttribute('data-ending-style')
          ? 'ending'
          : 'idle',
    });
    this.#core.setMedia(this.#volume.value ?? unavailableVolume);

    const state = this.#core.getState();

    applyStateDataAttrs(this, state, VolumePopoverStateDataAttrs);
    this.hidden = state.hidden;

    if (state.hidden) {
      this.close();
      this.disconnectTrigger();
    }
  }
}
