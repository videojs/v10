import type { NonNullableObject } from '@videojs/utils/types';

import type { PlaybackRateRadioGroupState } from './playback-rate-radio-group-core';

export interface PlaybackRateRadioGroupProps {
  /** Custom label for the options group. */
  label?: string | ((state: PlaybackRateRadioGroupState) => string) | undefined;
  /** Custom formatter for visible playback rate labels. */
  formatRate?: ((rate: number) => string) | undefined;
  /** Whether playback rate selection is disabled. */
  disabled?: boolean | undefined;
}

function formatPlaybackRate(rate: number): string {
  return `${rate}×`;
}

export const PLAYBACK_RATE_RADIO_GROUP_DEFAULT_PROPS: NonNullableObject<PlaybackRateRadioGroupProps> = {
  label: '',
  formatRate: formatPlaybackRate,
  disabled: false,
};
