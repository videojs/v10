'use client';

import {
  type PlaybackRateRadioGroupCore,
  PlaybackRateRadioGroupCore as PlaybackRateRadioGroupCoreClass,
} from '@videojs/core';
import { logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import { useCallback, useState } from 'react';

import { usePlayer } from '../../player/context';

export interface PlaybackRateOptionsProps extends PlaybackRateRadioGroupCore.Props {}

export interface PlaybackRateOption {
  rate: number;
  value: string;
  label: string;
  disabled: boolean;
}

export interface PlaybackRateOptionsResult {
  state: PlaybackRateRadioGroupCore.State;
  rate: number;
  value: string;
  options: PlaybackRateOption[];
  disabled: boolean;
  setRate: (rate: number) => void;
  setValue: (value: string) => void;
}

/**
 * Create playback rate menu options from the player playback rate state.
 * Returns `null` when the playback rate feature is not configured.
 *
 * @param props - Optional `label`, `formatRate`, and `disabled` overrides.
 */
export function usePlaybackRateOptions(props?: PlaybackRateOptionsProps): PlaybackRateOptionsResult | null {
  const media = usePlayer(selectPlaybackRate);
  const [core] = useState(() => new PlaybackRateRadioGroupCoreClass());

  core.setProps(props ?? {});

  const setRate = useCallback((rate: number) => core.select(media!, rate), [core, media]);
  const setValue = useCallback((value: string) => core.selectValue(media!, value), [core, media]);

  if (!media) {
    if (__DEV__) logMissingFeature('usePlaybackRateOptions', selectPlaybackRate.displayName ?? 'playbackRate');
    return null;
  }

  core.setMedia(media);
  const state = core.getState();

  return {
    state,
    rate: state.rate,
    value: core.getRateValue(state.rate),
    options: state.rates.map((rate) => ({
      rate,
      value: core.getRateValue(rate),
      label: core.getRateLabel(rate),
      disabled: state.disabled,
    })),
    disabled: state.disabled,
    setRate,
    setValue,
  };
}

export namespace usePlaybackRateOptions {
  export type Props = PlaybackRateOptionsProps;
  export type Result = PlaybackRateOptionsResult;
  export type Option = PlaybackRateOption;
}
