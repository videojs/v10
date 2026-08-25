import type { MediaFeatureAvailability, MediaVolumeState } from '@videojs/media';

import { PopoverCore, type PopoverProps, type PopoverState } from '../popover/core';

export interface VolumePopoverProps extends PopoverProps {}

export interface VolumePopoverState extends PopoverState {
  /** Whether volume level controls are available. */
  availability: MediaFeatureAvailability;
  /** Whether the popup is hidden because volume level controls are unavailable. */
  hidden: boolean;
}

/** A volume-aware popover that preserves its mute trigger when volume level controls are unavailable. */
export class VolumePopoverCore extends PopoverCore {
  static override readonly defaultProps = PopoverCore.defaultProps;

  #media: MediaVolumeState | null = null;

  setMedia(media: MediaVolumeState): void {
    this.#media = media;
  }

  override getState(): VolumePopoverState {
    const availability = this.#media!.volumeAvailability;

    return {
      ...super.getState(),
      availability,
      hidden: availability !== 'available',
    };
  }
}

export namespace VolumePopoverCore {
  export type Props = VolumePopoverProps;
  export type State = VolumePopoverState;
}
