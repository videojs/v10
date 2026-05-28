'use client';

import { CAPTIONS_OFF_VALUE } from '@videojs/core';

import { useCaptionsOptions } from '../captions-radio-group/use-captions-options';
import { usePlaybackRateOptions } from '../playback-rate/use-playback-rate-options';
import type { MenuItemSettingContextValue } from './context';
import type { MenuItemSettingType } from './menu-item-type';

export function useMenuItemSetting(type: MenuItemSettingType | undefined): MenuItemSettingContextValue | null {
  const playbackRate = usePlaybackRateOptions();
  const captions = useCaptionsOptions();

  if (!type) return null;

  if (type === 'playback-rate') {
    if (!playbackRate) return null;

    const { state, options, value } = playbackRate;
    const label = options.find((option) => option.value === value)?.label ?? '';

    return { type, label, availability: state.availability };
  }

  if (!captions) return null;

  const { state, options, value } = captions;
  const label =
    value === CAPTIONS_OFF_VALUE ? 'Off' : (options.find((option) => option.value === value)?.label ?? 'Off');

  return { type, label, availability: state.availability };
}
