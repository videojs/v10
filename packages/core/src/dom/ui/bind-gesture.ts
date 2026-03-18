import type { GestureCore } from '../../core/ui/gesture/gesture-core';

import type { GesturePointerType } from './event';

export interface BindGestureOptions {
  container: HTMLElement;
  eventType: string;
  core: GestureCore;
  pointerType?: GesturePointerType;
}

/** Binds a gesture core to pointer events on the media container. */
export function bindGesture({ container, eventType, core, pointerType }: BindGestureOptions): () => void {
  const controller = new AbortController();

  container.addEventListener(
    eventType,
    (event: Event) => {
      const target = event.target as Element;
      if (target !== container && !target.localName.endsWith('video')) return;

      if (pointerType && (event as PointerEvent).pointerType !== pointerType) return;

      core.handleGesture();
    },
    { signal: controller.signal }
  );

  return () => {
    controller.abort();
  };
}
