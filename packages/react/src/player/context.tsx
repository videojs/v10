'use client';

import type { Media } from '@videojs/core';
import type { MediaContainer, PopupGroup } from '@videojs/core/dom';
import type { UnknownState, UnknownStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { Dispatch, HTMLAttributes, ReactNode, PointerEvent as ReactPointerEvent, SetStateAction } from 'react';
import { createContext, forwardRef, useContext, useEffect, useRef } from 'react';

import { useComposedRefs } from '../utils/use-composed-refs';

/** Shared player state and setters made available through a Player Provider. */
export interface PlayerContextValue {
  /** Reactive player store created by `createPlayer`. */
  store: UnknownStore;
  /** Attached media element, or `null` before mount. */
  media: Media | null;
  /** Setter that connects a media element to the player. */
  setMedia: Dispatch<SetStateAction<Media | null>>;
  /** Attached container element, or `null` before mount. */
  container: MediaContainer | null;
  /** Setter that connects a container element to the player. */
  setContainer: Dispatch<SetStateAction<HTMLElement | null>>;
  /** Shared coordinator for popups (menus, popovers) within the player. */
  popupGroup?: PopupGroup;
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
 * Access the player store when available, returning `undefined` outside a Player Provider.
 *
 * @label Without Selector
 */
export function useOptionalPlayer(): UnknownStore | undefined;
/**
 * Select a value from the player store when available, returning `undefined` outside a Player Provider.
 *
 * @label With Selector
 * @param selector - Derives a value from the player store state.
 */
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

/** Access the container element from within a Player Provider. */
export function useContainer(): MediaContainer | null {
  const { container } = usePlayerContext();
  return container;
}

/** Access the container element when a Player Provider is available. */
export function useOptionalContainer(): MediaContainer | null {
  const ctx = useContext(PlayerContext);
  return ctx?.container ?? null;
}

/** Access the interactive popup group when a Player Provider is available. */
export function useOptionalPopupGroup(): PopupGroup | undefined {
  const ctx = useContext(PlayerContext);
  return ctx?.popupGroup;
}

/** Access the media attach setter for connecting a media element to the player. */
export function useMediaAttach(): Dispatch<SetStateAction<Media | null>> | undefined {
  const ctx = useContext(PlayerContext);
  return ctx?.setMedia;
}

/** Access the container attach setter for connecting a container element to the player. */
export function useContainerAttach(): Dispatch<SetStateAction<HTMLElement | null>> | undefined {
  const ctx = useContext(PlayerContext);
  return ctx?.setContainer;
}

/** Props for the Container component. */
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Content rendered inside the container. */
  children?: ReactNode;
}

/** Root element that hosts player UI, keyboard focus, and gesture handling. */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  { children, tabIndex = 0, ...props },
  ref
) {
  const setContainer = useContainerAttach();
  const internalRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, internalRef);

  useEffect(() => {
    setContainer?.(internalRef.current);
    return () => setContainer?.(null);
  }, [setContainer]);

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    props.onPointerUp?.(event);
    const el = internalRef.current;
    if (!el) return;
    // If nothing inside has focus, grab it so keyboard events reach hotkey listeners.
    if (!el.contains(document.activeElement) || document.activeElement === document.body) {
      el.focus({ preventScroll: true });
    }
  };

  return (
    <div ref={composedRef} tabIndex={tabIndex} {...props} onPointerUp={handlePointerUp}>
      {children}
    </div>
  );
});

export namespace Container {
  export type Props = ContainerProps;
}
