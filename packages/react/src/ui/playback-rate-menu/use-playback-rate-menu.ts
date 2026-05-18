'use client';

import type { PlaybackRateMenuCore } from '@videojs/core';
import { useCallback } from 'react';

import { usePlaybackRateMenuContext } from './context';

export interface PlaybackRateMenuOption {
  rate: number;
  value: string;
  label: string;
  disabled: boolean;
}

export interface PlaybackRateMenuResult {
  state: PlaybackRateMenuCore.State;
  rate: number;
  value: string;
  options: PlaybackRateMenuOption[];
  disabled: boolean;
  setRate: (rate: number) => void;
  setValue: (value: string) => void;
}

export function usePlaybackRateMenu(): PlaybackRateMenuResult {
  const { core, media, state } = usePlaybackRateMenuContext();

  const setRate = useCallback((rate: number) => core.select(media, rate), [core, media]);
  const setValue = useCallback((value: string) => core.selectValue(media, value), [core, media]);

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

export namespace usePlaybackRateMenu {
  export type Result = PlaybackRateMenuResult;
  export type Option = PlaybackRateMenuOption;
}
