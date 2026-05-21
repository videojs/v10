'use client';

import type { CaptionsMenuCore, CaptionsMenuTrack } from '@videojs/core';
import { useCallback } from 'react';

import { useCaptionsMenuContext } from './context';

export interface CaptionsMenuOption {
  track: CaptionsMenuTrack | null;
  value: string;
  label: string;
  disabled: boolean;
}

export interface CaptionsMenuResult {
  state: CaptionsMenuCore.State;
  selectedTrack: CaptionsMenuTrack | null;
  selectedTrackIndex: number | null;
  value: string;
  options: CaptionsMenuOption[];
  menuSectionLabel: string;
  availability: CaptionsMenuCore.State['availability'];
  disabled: boolean;
  setTrack: (trackIndex: number | null) => void;
  setValue: (value: string) => void;
}

export function useCaptionsMenu(): CaptionsMenuResult {
  const { core, media, state } = useCaptionsMenuContext();
  const selectedTrack = core.getSelectedTrack(state);

  const setTrack = useCallback((trackIndex: number | null) => core.select(media, trackIndex), [core, media]);
  const setValue = useCallback((value: string) => core.selectValue(media, value), [core, media]);

  return {
    state,
    selectedTrack,
    selectedTrackIndex: state.selectedTrackIndex,
    value: core.getTrackValue(state.selectedTrackIndex),
    options:
      state.tracks.length > 0
        ? [
            {
              track: null,
              value: core.getTrackValue(null),
              label: core.getOffLabel(),
              disabled: state.disabled,
            },
            ...state.tracks.map((track) => ({
              track,
              value: core.getTrackValue(track.index),
              label: core.getTrackLabel(track),
              disabled: state.disabled,
            })),
          ]
        : [],
    availability: state.availability,
    menuSectionLabel: core.getMenuSectionLabel(),
    disabled: state.disabled,
    setTrack,
    setValue,
  };
}

export namespace useCaptionsMenu {
  export type Result = CaptionsMenuResult;
  export type Option = CaptionsMenuOption;
}
