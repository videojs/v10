'use client';

import type { Media } from '@videojs/core/dom';
import type { UnknownState, UnknownStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { Dispatch, HTMLAttributes, ReactNode, SetStateAction } from 'react';
import { Children, createContext, forwardRef, isValidElement, useContext, useEffect, useRef } from 'react';
import { Gesture } from '../ui/gesture/gesture';

import { useComposedRefs } from '../utils/use-composed-refs';

export interface PlayerContextValue {
  store: UnknownStore;
  media: Media | null;
  setMedia: Dispatch<SetStateAction<Media | null>>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);
const EMPTY_UNSUBSCRIBE = () => {};
const EMPTY_STORE = {
  state: {} as UnknownState,
  subscribe: () => EMPTY_UNSUBSCRIBE,
} as Pick<UnknownStore, 'state' | 'subscribe'>;

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

/**
 * Access the player store from within a Player Provider.
 *
 * @label Without Selector
 */
export function usePlayer(): UnknownStore;
/**
 * Select a value from the player store. Re-renders when the selected value changes.
 *
 * @label With Selector
 * @param selector - Derives a value from the player store state.
 */
export function usePlayer<R>(selector: (state: UnknownState) => R): R;
export function usePlayer<R>(selector?: (state: UnknownState) => R) {
  const { store } = usePlayerContext();
  return useStore(store, selector as any);
}

/**
 * Access player state when available, but return `undefined` outside Provider.
 *
 * This is useful for components that can operate without player context
 * (e.g. they accept fully explicit props as a fallback).
 */
/** @label Without Selector */
export function useOptionalPlayer(): UnknownStore | undefined;
/** @label With Selector */
export function useOptionalPlayer<R>(selector: (state: UnknownState) => R): R | undefined;
export function useOptionalPlayer<R>(selector?: (state: UnknownState) => R) {
  const ctx = useContext(PlayerContext);
  const store = (ctx?.store ?? (EMPTY_STORE as unknown as UnknownStore)) as UnknownStore;
  const value = useStore(store, (ctx ? selector : undefined) as any);
  return ctx ? value : undefined;
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

  const hasGestureChild = Children.toArray(children).some((child) => isValidElement(child) && child.type === Gesture);

  useEffect(() => {
    if (!media) return;
    return store.attach({ media, container: internalRef.current });
  }, [media, store]);

  return (
    <div ref={composedRef} {...props}>
      {!hasGestureChild && <Gesture type="pointerup" command="toggle-paused" />}
      {children}
    </div>
  );
});

export namespace Container {
  export type Props = ContainerProps;
}
