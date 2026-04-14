'use client';

import { createTapGesture, type GesturePointerType, type GestureRegion } from '@videojs/core/dom';
import type { RefObject } from 'react';
import { useEffect } from 'react';

import { useContainer } from '../../player/context';
import { useLatestRef } from '../../utils/use-latest-ref';

export interface UseTapGestureOptions {
  pointer?: GesturePointerType;
  region?: GestureRegion;
  disabled?: boolean;
  target?: RefObject<HTMLElement | null>;
}

export function useTapGesture(onActivate: (event: PointerEvent) => void, options?: UseTapGestureOptions): void {
  const { pointer, region, disabled = false, target } = options ?? {};
  const contextContainer = useContainer();
  const container = target?.current ?? contextContainer;
  const onActivateRef = useLatestRef(onActivate);

  useEffect(() => {
    if (!container || disabled) return;

    return createTapGesture(container, (event) => onActivateRef.current(event), { pointer, region });
  }, [container, disabled, pointer, region, onActivateRef]);
}
