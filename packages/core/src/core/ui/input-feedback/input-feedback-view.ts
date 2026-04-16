import { formatTime } from '@videojs/utils/time';

import type { MediaPlaybackState, MediaTextTrackState, MediaTimeState, MediaVolumeState } from '../../media/state';
import {
  volumeLevel as getVolumeLevel,
  type InputFeedbackEvent,
  type InputFeedbackLabels,
  type InputFeedbackState,
} from './input-feedback-core';
import type { InputFeedbackItemDataState, InputFeedbackVolumeLevel } from './input-feedback-item';

export interface InputFeedbackCurrentValues {
  volume: string;
  captions: string;
  seek: string;
  playback: string;
}

export interface InputFeedbackRootDerivedState {
  volumePercentage: string;
  currentVolumeLevel: InputFeedbackVolumeLevel | null;
  currentValues: InputFeedbackCurrentValues;
}

export interface InputFeedbackRootMediaState {
  playback?: Pick<MediaPlaybackState, 'paused'> | undefined;
  textTrack?: Pick<MediaTextTrackState, 'subtitlesShowing'> | undefined;
  time?: Pick<MediaTimeState, 'currentTime' | 'duration'> | undefined;
  volume?: Pick<MediaVolumeState, 'volume' | 'muted'> | undefined;
}

export function getCurrentInputFeedbackVolumeLevel(
  volume: Pick<MediaVolumeState, 'volume' | 'muted'> | undefined
): InputFeedbackVolumeLevel | null {
  if (!volume) return null;
  if (volume.muted) return 'off';
  return getVolumeLevel(volume.volume);
}

export function getInputFeedbackPredictedVolumeState(
  event: InputFeedbackEvent,
  feedbackState: InputFeedbackState,
  volume: Pick<MediaVolumeState, 'volume' | 'muted'> | undefined
): Pick<MediaVolumeState, 'volume' | 'muted'> | undefined {
  if (!volume) return undefined;

  if (
    event.action === 'volumeStep' &&
    feedbackState.active &&
    feedbackState.action === 'volumeStep' &&
    feedbackState.volumeLabel?.endsWith('%')
  ) {
    return {
      volume: Number.parseInt(feedbackState.volumeLabel, 10) / 100,
      muted: false,
    };
  }

  return {
    volume: volume.volume,
    muted: volume.muted,
  };
}

export function getInputFeedbackRootDerivedState(
  state: InputFeedbackState,
  labels: InputFeedbackLabels,
  media: InputFeedbackRootMediaState
): InputFeedbackRootDerivedState {
  const currentVolumePercentage = media.volume?.muted === false ? `${Math.round(media.volume.volume * 100)}%` : '0%';
  const isVolumeAction = state.action === 'volumeStep' || state.action === 'toggleMuted';
  const volumePercentage =
    isVolumeAction && state.active
      ? state.volumeLevel === 'off'
        ? '0%'
        : state.label?.endsWith('%')
          ? state.label
          : currentVolumePercentage
      : currentVolumePercentage;

  return {
    volumePercentage,
    currentVolumeLevel: getCurrentInputFeedbackVolumeLevel(media.volume),
    currentValues: {
      volume: media.volume?.muted === true ? labels.muted : currentVolumePercentage,
      captions: media.textTrack?.subtitlesShowing ? labels.captionsOn : labels.captionsOff,
      seek: formatTime(media.time?.currentTime ?? 0, media.time?.duration),
      playback: media.playback?.paused === false ? labels.playing : labels.paused,
    },
  };
}

export function getInputFeedbackValueText(
  state: InputFeedbackItemDataState,
  currentValues: InputFeedbackCurrentValues
): string {
  if (state.value) return state.value;

  switch (state.group) {
    case 'volume':
      return currentValues.volume;
    case 'captions':
      return currentValues.captions;
    case 'seek':
      return currentValues.seek;
    case 'playback':
      return currentValues.playback;
    default:
      return '';
  }
}
