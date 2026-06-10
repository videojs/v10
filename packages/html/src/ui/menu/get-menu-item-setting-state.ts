import type { MediaPlaybackRateState, MediaTextTrackState } from '@videojs/core';
import { CAPTIONS_OFF_VALUE, type CaptionsRadioGroupCore, type PlaybackRateRadioGroupCore } from '@videojs/core';

import type { MenuItemSettingType } from './menu-item-type';

export interface MenuItemSettingState {
  label: string;
  availability: 'available' | 'unavailable';
}

export function getMenuItemSettingState(
  type: MenuItemSettingType,
  cores: {
    playbackRate: PlaybackRateRadioGroupCore;
    captions: CaptionsRadioGroupCore;
  },
  media: MediaPlaybackRateState | MediaTextTrackState
): MenuItemSettingState {
  if (type === 'playback-rate') {
    cores.playbackRate.setMedia(media as MediaPlaybackRateState);
    const state = cores.playbackRate.getState();

    return {
      label: cores.playbackRate.getRateLabel(state.rate),
      availability: state.availability,
    };
  }

  cores.captions.setMedia(media as MediaTextTrackState);
  const state = cores.captions.getState();

  if (state.value === CAPTIONS_OFF_VALUE) {
    return { label: 'Off', availability: state.availability };
  }

  const track = state.tracks.find((candidate) => candidate.value === state.value);

  return {
    label: track?.label ?? 'Off',
    availability: state.availability,
  };
}
