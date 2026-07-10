'use client';

import { CAPTIONS_OFF_VALUE, CaptionsRadioGroupCore } from '@videojs/core';
import { logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import { resolveTranslation } from '@videojs/core/i18n';
import { useCallback, useState } from 'react';

import { useTranslator } from '../../i18n/context';
import { usePlayer } from '../../player/context';

export interface CaptionsOptionsProps extends CaptionsRadioGroupCore.Props {}

export interface CaptionsOption {
  value: string;
  label: string;
  disabled: boolean;
}

export interface CaptionsOptionsResult {
  state: CaptionsRadioGroupCore.State;
  value: string;
  options: CaptionsOption[];
  disabled: boolean;
  showMenu: boolean;
  setValue: (value: string) => void;
}

export function useCaptionsOptions(props?: CaptionsOptionsProps): CaptionsOptionsResult | null {
  'use no memo';

  const media = usePlayer(selectTextTrack);
  const t = useTranslator();
  const [core] = useState(() => new CaptionsRadioGroupCore());

  core.setProps(props ?? {});

  const setValue = useCallback((value: string) => core.selectValue(media!, value), [core, media]);

  if (!media) {
    if (__DEV__) logMissingFeature('useCaptionsOptions', selectTextTrack.displayName ?? 'textTrack');
    return null;
  }

  core.setMedia(media);
  const state = core.getState();
  const showMenu = state.tracks.length > 1;

  return {
    state,
    value: state.value,
    options: [
      {
        value: CAPTIONS_OFF_VALUE,
        label: resolveTranslation(t, 'Off'),
        disabled: state.disabled,
      },
      ...state.tracks.map((track) => ({
        value: track.value,
        label: resolveTranslation(t, track.label),
        disabled: state.disabled,
      })),
    ],
    disabled: state.disabled,
    showMenu,
    setValue,
  };
}

export namespace useCaptionsOptions {
  export type Props = CaptionsOptionsProps;
  export type Result = CaptionsOptionsResult;
  export type Option = CaptionsOption;
}
