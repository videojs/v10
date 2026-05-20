'use client';

import { createDoubleTapGesture, type GesturePointerType, type GestureRegion } from '@videojs/core/dom';
import type { RefObject } from 'react';
import { useEffect } from 'react';

import { useContainer } from '../../player/context';
import { useLatestRef } from '../../utils/use-latest-ref';

/** Options for the `useDoubleTapGesture` hook. */
export interface UseDoubleTapGestureOptions {
  /** Pointer type that triggers the gesture. */
  pointer?: GesturePointerType;
  /** Region of the container that activates the gesture. */
  region?: GestureRegion;
  /** Disables the gesture binding without unmounting. */
  disabled?: boolean;
  /** Override the activation target instead of the player container. */
  target?: RefObject<HTMLElement | null>;
}

/**
 * Bind a double-tap gesture handler to the player container (or a custom target).
 *
 * @param onActivate - Called on each double-tap with the originating pointer event.
 * @param options - Optional gesture configuration.
 */
export function useDoubleTapGesture(
  onActivate: (event: PointerEvent) => void,
  options?: UseDoubleTapGestureOptions
): void {
  const { pointer, region, disabled = false, target } = options ?? {};
  const contextContainer = useContainer();
  const container = target?.current ?? contextContainer;
  const onActivateRef = useLatestRef(onActivate);

  useEffect(() => {
    if (!container || disabled) return;

    return createDoubleTapGesture(container, (event) => onActivateRef.current(event), { pointer, region });
  }, [container, disabled, pointer, region, onActivateRef]);
}
