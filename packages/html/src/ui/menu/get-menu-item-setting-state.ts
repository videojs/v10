import type {
  AudioTrackRadioGroupCore,
  CaptionsRadioGroupCore,
  PlaybackRateRadioGroupCore,
  QualityRadioGroupCore,
} from '@videojs/core';
import type { Text, TextParams } from '@videojs/core/i18n';
import { autoText, offText } from '@videojs/core/i18n/text/menu';
import type {
  MediaAudioTrackState,
  MediaPlaybackRateState,
  MediaQualityState,
  MediaTextTrackState,
} from '@videojs/media';

import type { MenuItemSettingType } from './menu-item-type';

export interface MenuItemSettingState {
  label: Text | string;
  labelParams?: TextParams | undefined;
  availability: 'available' | 'unavailable';
}

export function getMenuItemSettingState(
  type: MenuItemSettingType,
  cores: {
    playbackRate: PlaybackRateRadioGroupCore;
    quality: QualityRadioGroupCore;
    audioTrack: AudioTrackRadioGroupCore;
    captions: CaptionsRadioGroupCore;
  },
  media: MediaPlaybackRateState | MediaQualityState | MediaAudioTrackState | MediaTextTrackState
): MenuItemSettingState {
  if (type === 'playback-rate') {
    cores.playbackRate.setMedia(media as MediaPlaybackRateState);
    const state = cores.playbackRate.getState();
    const option = state.options.find((candidate) => candidate.value === state.value);

    return {
      label: option?.label ?? cores.playbackRate.getRateLabel(state.rate),
      labelParams: option?.labelParams,
      availability: state.availability,
    };
  }

  if (type === 'quality') {
    cores.quality.setMedia(media as MediaQualityState);
    const state = cores.quality.getState();

    const option = state.options.find((candidate) => candidate.value === state.value);

    return {
      label: option?.label ?? autoText,
      labelParams: option?.labelParams,
      availability: state.availability,
    };
  }

  if (type === 'audio-track') {
    cores.audioTrack.setMedia(media as MediaAudioTrackState);
    const state = cores.audioTrack.getState();
    const option = state.options.find((candidate) => candidate.value === state.value);

    return {
      label: option?.label ?? '',
      labelParams: option?.labelParams,
      availability: state.availability,
    };
  }

  cores.captions.setMedia(media as MediaTextTrackState);
  const state = cores.captions.getState();

  const option = state.options.find((candidate) => candidate.value === state.value);

  return {
    label: option?.label ?? offText,
    labelParams: option?.labelParams,
    availability: state.availability,
  };
}
