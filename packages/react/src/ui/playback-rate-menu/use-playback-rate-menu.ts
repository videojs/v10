'use client';

import type { PlaybackRateMenuCore } from '@videojs/core';
import { useCallback } from 'react';

import { usePlaybackRateMenuContext } from './context';

/** One selectable option in the playback rate menu. */
export interface PlaybackRateMenuOption {
  /** Numeric playback rate (e.g. `1`, `1.5`). */
  rate: number;
  /** Stable string value used by menu radio items. */
  value: string;
  /** Human-readable label (e.g. `"1×"`, `"Normal"`). */
  label: string;
  /** Whether selecting this option is currently disabled. */
  disabled: boolean;
}

/** Return shape of the `usePlaybackRateMenu` hook. */
export interface PlaybackRateMenuResult {
  /** Snapshot of the playback rate menu core state. */
  state: PlaybackRateMenuCore.State;
  /** Currently active playback rate. */
  rate: number;
  /** Stable string value for the active rate. */
  value: string;
  /** Available options ordered for display. */
  options: PlaybackRateMenuOption[];
  /** Whether the menu is currently disabled. */
  disabled: boolean;
  /** Set the active rate by numeric value. */
  setRate: (rate: number) => void;
  /** Set the active rate by its menu value string. */
  setValue: (value: string) => void;
}

/** Headless playback rate menu — exposes options, current value, and setters. */
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
