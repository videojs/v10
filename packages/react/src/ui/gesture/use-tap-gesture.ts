import type { GestureProps } from '@videojs/core';
import { createTapGesture } from '@videojs/core/dom';
import type { RefObject } from 'react';
import { useEffect } from 'react';

import { useContainer } from '../../player/context';
import { useCommittedRef } from '../../utils/use-committed-ref';

export interface UseTapGestureOptions extends Pick<GestureProps, 'pointer' | 'region' | 'disabled'> {
  target?: RefObject<HTMLElement | null>;
}

export function useTapGesture(onActivate: (event: PointerEvent) => void, options?: UseTapGestureOptions): void {
  const { pointer, region, disabled = false, target } = options ?? {};
  const contextContainer = useContainer();
  const container = target?.current ?? contextContainer;
  const onActivateRef = useCommittedRef(onActivate);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the retained listener reads the commit-published callback without rebinding
  useEffect(() => {
    if (!container || disabled) return;

    return createTapGesture(container, (event) => onActivateRef.current(event), { pointer, region });
  }, [container, disabled, pointer, region]);
}
