'use client';

import { CAPTIONS_OFF_VALUE, CaptionsRadioGroupCore } from '@videojs/core';
import { logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import { translateText } from '@videojs/core/i18n';
import { offText } from '@videojs/core/i18n/text/menu';
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
  selectedLabel: string;
  options: CaptionsOption[];
  disabled: boolean;
  showMenu: boolean;
  setValue: (value: string) => void;
}

/**
 * Create captions menu options (including an `Off` option) from the player
 * text track state. Returns `null` when the text tracks feature is not
 * configured.
 *
 * @param props - Optional `label`, `formatTrack`, and `disabled` overrides.
 */
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
  const offLabel = translateText(offText, t);
  const options = [
    {
      value: CAPTIONS_OFF_VALUE,
      label: offLabel,
      disabled: state.disabled,
    },
    ...state.tracks.map((track) => ({
      value: track.value,
      label: translateText(track.label, t),
      disabled: state.disabled,
    })),
  ];

  return {
    state,
    value: state.value,
    selectedLabel: options.find((option) => option.value === state.value)?.label ?? offLabel,
    options,
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
