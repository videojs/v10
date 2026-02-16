'use client';

import type { Media } from '@videojs/core/dom';
import type { UnknownState, UnknownStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { Dispatch, HTMLAttributes, ReactNode, SetStateAction } from 'react';
import { createContext, forwardRef, useContext, useEffect, useRef } from 'react';

import { useComposedRefs } from '../utils/use-composed-refs';

export interface PlayerContextValue {
  store: UnknownStore;
  media: Media | null;
  setMedia: Dispatch<SetStateAction<Media | null>>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerContextProvider({
  value,
  children,
}: {
  value: PlayerContextValue;
  children: ReactNode;
}): ReactNode {
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

/** Access the full player context value. Throws if used outside a Player Provider. */
export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayerContext must be used within a Player Provider');
  return ctx;
}

/** Access the player store from within a Player Provider. */
export function usePlayer(): UnknownStore;
export function usePlayer<R>(selector: (state: UnknownState) => R): R;
export function usePlayer<R>(selector?: (state: UnknownState) => R) {
  const { store } = usePlayerContext();
  return useStore(store, selector as any);
}

/** Access the media element from within a Player Provider. */
export function useMedia(): Media | null {
  const { media } = usePlayerContext();
  return media;
}

/** Access the media registration setter for connecting a media element to the player. */
export function useMediaRegistration(): Dispatch<SetStateAction<Media | null>> | undefined {
  const ctx = useContext(PlayerContext);
  return ctx?.setMedia;
}

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container({ children, ...props }, ref) {
  const { store, media } = usePlayerContext();
  const internalRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, internalRef);

  useEffect(() => {
    if (!media) return;
    return store.attach({ media, container: internalRef.current });
  }, [media, store]);

  return (
    <div ref={composedRef} {...props}>
      {children}
    </div>
  );
});

export namespace Container {
  export type Props = ContainerProps;
}
