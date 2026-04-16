'use client';

import {
  type AnyPlayerStore,
  createDoubleTapGesture,
  createTapGesture,
  type GestureActionName,
  type GesturePointerType,
  type GestureRegion,
  resolveGestureAction,
} from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useContainer, usePlayer } from '../../player/context';

export interface GestureProps {
  type: 'tap' | 'doubletap' | (string & {});
  action: GestureActionName | (string & {});
  value?: number;
  pointer?: GesturePointerType;
  region?: GestureRegion;
  disabled?: boolean;
}

export function Gesture({ type, action, value, pointer, region, disabled }: GestureProps): ReactNode {
  const store = usePlayer() as AnyPlayerStore;
  const container = useContainer();

  useEffect(() => {
    if (!container || !type || !action || disabled) return;

    const resolver = resolveGestureAction(action);
    if (!resolver) return;

    const onActivate = (event: PointerEvent) => {
      resolver({ store, value, event });
    };

    const options = { pointer, region, action, value };

    if (type === 'doubletap') {
      return createDoubleTapGesture(container, onActivate, options);
    }

    return createTapGesture(container, onActivate, options);
  }, [container, store, type, action, value, pointer, region, disabled]);

  return null;
}

export namespace Gesture {
  export type Props = GestureProps;
}

/** @deprecated Use `GestureProps` instead. */
export type MediaGestureProps = GestureProps;

/** @deprecated Use `Gesture` instead. */
export const MediaGesture = Gesture;
