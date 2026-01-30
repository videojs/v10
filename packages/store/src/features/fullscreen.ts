import { containsComposedNode, listen } from '@videojs/utils/dom';
import type { FeatureActions, FeatureCreator, FeatureState } from '../types';

export interface FullscreenTargets {
  container: HTMLElement;
  media: HTMLMediaElement;
}

export const fullscreen = (() => {
  const doc = globalThis?.document;

  return {
    initialState: {
      /** Whether the container is in fullscreen. */
      fullscreen: false,
    },

    getSnapshot: ({ container }) => {
      if (!doc) return { fullscreen: false };

      const currentFullscreenElement = getFullscreenElement(doc);
      return { fullscreen: isContainerFullscreen(container, currentFullscreenElement, doc) };
    },

    subscribe: {
      container: (_targets, update, signal) => {
        if (!doc) return;
        const events = [
          'fullscreenchange',
          'webkitfullscreenchange',
          'mozfullscreenchange',
          'MSFullscreenChange',
        ] as const;
        events.forEach((event) => listen(doc, event, update, { signal }));
      },
      media: () => {},
    },

    actions: ({ container, media }) => ({
      requestFullscreen() {
        try {
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if ((media as HTMLMediaElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
            (media as HTMLMediaElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
          } else if ((container as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
            (container as HTMLElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
          } else if ((container as HTMLElement & { mozRequestFullScreen?: () => void }).mozRequestFullScreen) {
            (container as HTMLElement & { mozRequestFullScreen: () => void }).mozRequestFullScreen();
          } else if ((container as HTMLElement & { msRequestFullscreen?: () => void }).msRequestFullscreen) {
            (container as HTMLElement & { msRequestFullscreen: () => void }).msRequestFullscreen();
          }
        } catch (error) {
          console.warn('Fullscreen operation failed:', error);
        }
      },

      exitFullscreen() {
        if (!doc) return;
        try {
          const d = doc as Document & {
            exitFullscreen?: () => Promise<void>;
            webkitExitFullscreen?: () => void;
            mozCancelFullScreen?: () => void;
            msExitFullscreen?: () => void;
          };
          d.exitFullscreen?.() ?? d.webkitExitFullscreen?.() ?? d.mozCancelFullScreen?.() ?? d.msExitFullscreen?.();
        } catch (error) {
          console.warn('Fullscreen operation failed:', error);
        }
      },
    }),
  };
}) satisfies FeatureCreator<FullscreenTargets>;

export type FullscreenState = FeatureState<typeof fullscreen>;
export type FullscreenActions = FeatureActions<typeof fullscreen>;

/** @TODO This is implemented for web/browser only! We will need an alternative for e.g. React Native. */

function getFullscreenElement(doc: Document): Element | null {
  return (
    doc.fullscreenElement ??
    (doc as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ??
    (doc as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ??
    (doc as Document & { msFullscreenElement?: Element }).msFullscreenElement ??
    null
  );
}

function isContainerFullscreen(
  container: HTMLElement,
  currentFullscreenElement: Element | null,
  doc: Document
): boolean {
  if (!currentFullscreenElement) return false;

  if (currentFullscreenElement === container) return true;
  if (currentFullscreenElement.contains?.(container)) return true;

  if (currentFullscreenElement.localName?.includes('-')) {
    let currentRoot = (currentFullscreenElement as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
    const fullscreenElementKey =
      'fullscreenElement' in doc
        ? 'fullscreenElement'
        : 'webkitFullscreenElement' in doc
          ? 'webkitFullscreenElement'
          : undefined;

    if (fullscreenElementKey && !(fullscreenElementKey in (currentRoot ?? {}))) {
      return containsComposedNode(currentFullscreenElement, container);
    }

    if (fullscreenElementKey) {
      const key = fullscreenElementKey as keyof ShadowRoot;
      while (currentRoot?.[key]) {
        const el = currentRoot[key] as Element;
        if (el === container) return true;
        if (el?.contains?.(container)) return true;
        currentRoot = (el as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
      }
    }
  }

  return false;
}
