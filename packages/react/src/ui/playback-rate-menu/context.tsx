'use client';

import type { MediaPlaybackRateState, PlaybackRateMenuCore } from '@videojs/core';
import { createContext, useContext } from 'react';

export interface PlaybackRateMenuContextValue {
  core: PlaybackRateMenuCore;
  media: MediaPlaybackRateState;
  state: PlaybackRateMenuCore.State;
}

const PlaybackRateMenuContext = createContext<PlaybackRateMenuContextValue | null>(null);

export function PlaybackRateMenuProvider({
  value,
  children,
}: {
  value: PlaybackRateMenuContextValue;
  children: React.ReactNode;
}): React.ReactNode {
  return <PlaybackRateMenuContext.Provider value={value}>{children}</PlaybackRateMenuContext.Provider>;
}

export function usePlaybackRateMenuContext(): PlaybackRateMenuContextValue {
  const ctx = useContext(PlaybackRateMenuContext);
  if (!ctx) throw new Error('PlaybackRateMenu compound components must be used within a PlaybackRateMenu.Root');
  return ctx;
}
