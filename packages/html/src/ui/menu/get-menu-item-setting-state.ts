import type {
  MediaAudioTrackState,
  MediaPlaybackRateState,
  MediaQualityState,
  MediaTextTrackState,
} from '@videojs/core';
import {
  type AudioTrackRadioGroupCore,
  CAPTIONS_OFF_VALUE,
  type CaptionsRadioGroupCore,
  type PlaybackRateRadioGroupCore,
  QUALITY_AUTO_VALUE,
  type QualityRadioGroupCore,
} from '@videojs/core';

import type { MenuItemSettingType } from './menu-item-type';

export interface MenuItemSettingState {
  label: string;
  labelParams?: Record<string, string | number> | undefined;
  availability: 'available' | 'unavailable';
}

function getAutoLabelState(label: string): Pick<MenuItemSettingState, 'label' | 'labelParams'> {
  const match = /^Auto \((.+)\)$/.exec(label);
  if (!match) return { label };
  return { label: 'Auto ({label})', labelParams: { label: match[1]! } };
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

    return {
      label: cores.playbackRate.getRateLabel(state.rate),
      availability: state.availability,
    };
  }

  if (type === 'quality') {
    cores.quality.setMedia(media as MediaQualityState);
    const state = cores.quality.getState();

    if (state.value === QUALITY_AUTO_VALUE) {
      return {
        ...getAutoLabelState(state.autoLabel),
        availability: state.availability,
      };
    }

    const rendition = state.renditions.find((candidate) => candidate.value === state.value);

    return {
      label: rendition?.label ?? 'Auto',
      availability: state.availability,
    };
  }

  if (type === 'audio-track') {
    cores.audioTrack.setMedia(media as MediaAudioTrackState);
    const state = cores.audioTrack.getState();
    const track = state.tracks.find((candidate) => candidate.value === state.value);

    return {
      label: track?.label ?? '',
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
