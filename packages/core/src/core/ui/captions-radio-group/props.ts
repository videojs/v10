import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaTextTrack } from '../../media/state';
import type { CaptionsRadioGroupState } from './captions-radio-group-core';

export interface CaptionsRadioGroupProps {
  /** Custom label for the menu trigger. */
  label?: string | ((state: CaptionsRadioGroupState) => string) | undefined;
  /** Custom formatter for visible track labels. */
  formatTrack?: ((track: MediaTextTrack) => string) | undefined;
  /** Whether track selection is disabled. */
  disabled?: boolean | undefined;
}

function formatTrackLabel(track: MediaTextTrack): string {
  if (track.label) return track.label;
  if (track.language) return track.language;
  return track.kind === 'captions' ? 'Captions' : 'Subtitles';
}

export const CAPTIONS_RADIO_GROUP_DEFAULT_PROPS: NonNullableObject<CaptionsRadioGroupProps> = {
  label: '',
  formatTrack: formatTrackLabel,
  disabled: false,
};
