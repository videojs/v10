'use client';

import type { CaptionsMenuCore, MediaTextTrackState } from '@videojs/core';
import { createContext, useContext } from 'react';

export interface CaptionsMenuContextValue {
  core: CaptionsMenuCore;
  media: MediaTextTrackState;
  state: CaptionsMenuCore.State;
}

const CaptionsMenuContext = createContext<CaptionsMenuContextValue | null>(null);

export function CaptionsMenuProvider({
  value,
  children,
}: {
  value: CaptionsMenuContextValue;
  children: React.ReactNode;
}): React.ReactNode {
  return <CaptionsMenuContext.Provider value={value}>{children}</CaptionsMenuContext.Provider>;
}

export function useCaptionsMenuContext(): CaptionsMenuContextValue {
  const ctx = useContext(CaptionsMenuContext);
  if (!ctx) throw new Error('CaptionsMenu compound components must be used within a CaptionsMenu.Root');
  return ctx;
}
