'use client';

import { CAPTIONS_OFF_VALUE } from '@videojs/core';
import type { ReactNode } from 'react';

import { useAudioTrackOptions } from '../audio-track/use-audio-track-options';
import { useCaptionsOptions } from '../captions-radio-group/use-captions-options';
import { usePlaybackRateOptions } from '../playback-rate/use-playback-rate-options';
import { useQualityOptions } from '../quality/use-quality-options';
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

function QualityMenuItemSettingProvider({ children }: { children: ReactNode }): ReactNode {
  const quality = useQualityOptions();
  if (!quality) return children;

  const { state, options, value } = quality;
  const label = options.find((option) => option.value === value)?.label ?? 'Auto';

  return (
    <MenuItemSettingContextProvider value={{ type: 'quality', label, availability: state.availability }}>
      {children}
    </MenuItemSettingContextProvider>
  );
}

function AudioTrackMenuItemSettingProvider({ children }: { children: ReactNode }): ReactNode {
  const audioTrack = useAudioTrackOptions();
  if (!audioTrack) return children;

  const { state, options, value } = audioTrack;
  const label = options.find((option) => option.value === value)?.label ?? '';

  return (
    <MenuItemSettingContextProvider value={{ type: 'audio-track', label, availability: state.availability }}>
      {children}
    </MenuItemSettingContextProvider>
  );
}

export function MenuItemSettingProvider({ type, children }: MenuItemSettingProviderProps): ReactNode {
  if (type === 'playback-rate')
    return <PlaybackRateMenuItemSettingProvider>{children}</PlaybackRateMenuItemSettingProvider>;
  if (type === 'quality') return <QualityMenuItemSettingProvider>{children}</QualityMenuItemSettingProvider>;
  if (type === 'audio-track') return <AudioTrackMenuItemSettingProvider>{children}</AudioTrackMenuItemSettingProvider>;
  if (type === 'captions') return <CaptionsMenuItemSettingProvider>{children}</CaptionsMenuItemSettingProvider>;
  return children;
}
