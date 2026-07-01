'use client';

import { AudioTrackRadioGroupCore } from '@videojs/core';
import { logMissingFeature, selectAudioTrack } from '@videojs/core/dom';
import { useCallback, useState } from 'react';

import { usePlayer } from '../../player/context';

export interface AudioTrackOptionsProps extends AudioTrackRadioGroupCore.Props {}

export interface AudioTrackOption {
  value: string;
  label: string;
  disabled: boolean;
}

export interface AudioTrackOptionsResult {
  state: AudioTrackRadioGroupCore.State;
  value: string;
  options: AudioTrackOption[];
  disabled: boolean;
  setValue: (value: string) => void;
}

export function useAudioTrackOptions(props?: AudioTrackOptionsProps): AudioTrackOptionsResult | null {
  'use no memo';

  const media = usePlayer(selectAudioTrack);
  const [core] = useState(() => new AudioTrackRadioGroupCore());

  core.setProps(props ?? {});

  const setValue = useCallback((value: string) => core.selectValue(media!, value), [core, media]);

  if (!media) {
    if (__DEV__) logMissingFeature('useAudioTrackOptions', selectAudioTrack.displayName ?? 'audioTrack');
    return null;
  }

  core.setMedia(media);
  const state = core.getState();

  return {
    state,
    value: state.value,
    options: state.tracks.map((track) => ({
      value: track.value,
      label: track.label,
      disabled: state.disabled,
    })),
    disabled: state.disabled,
    setValue,
  };
}

export namespace useAudioTrackOptions {
  export type Props = AudioTrackOptionsProps;
  export type Result = AudioTrackOptionsResult;
  export type Option = AudioTrackOption;
}
