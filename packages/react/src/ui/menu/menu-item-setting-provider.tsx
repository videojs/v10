'use client';

import { CAPTIONS_OFF_VALUE } from '@videojs/core';
import type { ReactNode } from 'react';

import { useCaptionsOptions } from '../captions-radio-group/use-captions-options';
import { usePlaybackRateOptions } from '../playback-rate/use-playback-rate-options';
import { MenuItemSettingContextProvider } from './context';
import type { MenuItemSettingType } from './menu-item-type';

export interface MenuItemSettingProviderProps {
  type: MenuItemSettingType;
  children: ReactNode;
}

function PlaybackRateMenuItemSettingProvider({ children }: { children: ReactNode }): ReactNode {
  const playbackRate = usePlaybackRateOptions();
  if (!playbackRate) return children;

  const { state, options, value } = playbackRate;
  const label = options.find((option) => option.value === value)?.label ?? '';

  return (
    <MenuItemSettingContextProvider value={{ type: 'playback-rate', label, availability: state.availability }}>
      {children}
    </MenuItemSettingContextProvider>
  );
}

function CaptionsMenuItemSettingProvider({ children }: { children: ReactNode }): ReactNode {
  const captions = useCaptionsOptions();
  if (!captions) return children;

  const { state, options, value } = captions;
  const label =
    value === CAPTIONS_OFF_VALUE ? 'Off' : (options.find((option) => option.value === value)?.label ?? 'Off');

  return (
    <MenuItemSettingContextProvider value={{ type: 'captions', label, availability: state.availability }}>
      {children}
    </MenuItemSettingContextProvider>
  );
}

export function MenuItemSettingProvider({ type, children }: MenuItemSettingProviderProps): ReactNode {
  if (type === 'playback-rate')
    return <PlaybackRateMenuItemSettingProvider>{children}</PlaybackRateMenuItemSettingProvider>;
  if (type === 'captions') return <CaptionsMenuItemSettingProvider>{children}</CaptionsMenuItemSettingProvider>;
  return children;
}
