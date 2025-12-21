import { containsComposedNode } from '@videojs/utils/dom';

/** @TODO This is implemented for web/browser only! We will need an alternative state mediator model for e.g. React Native. (CJP) */
export const fullscreenable = {
  fullscreen: {
    get(stateOwners: any): boolean {
      const { container } = stateOwners;
      if (!container || !globalThis?.document) return false;

      const doc = globalThis.document;
      const currentFullscreenElement
        = doc.fullscreenElement
          || (doc as any).webkitFullscreenElement
          || (doc as any).mozFullScreenElement
          || (doc as any).msFullscreenElement;

      if (!currentFullscreenElement) return false;

      // If document.fullscreenElement is the container, we're definitely in fullscreen
      if (currentFullscreenElement === container) {
        return true;
      }

      // Check if container is contained within the fullscreen element
      if (currentFullscreenElement.contains?.(container)) {
        return true;
      }

      // Handle web components with shadow DOM - traverse shadow DOM layers
      // In this case (most modern browsers), the fullscreenElement may be
      // a web component that contains our container within shadow DOM layers
      if (currentFullscreenElement.localName?.includes('-')) {
        let currentRoot = currentFullscreenElement.shadowRoot;

        // Check if ShadowRoot supports fullscreenElement (Safari < 16.4 workaround)
        const fullscreenElementKey
          = 'fullscreenElement' in doc
            ? 'fullscreenElement'
            : 'webkitFullscreenElement' in doc
              ? 'webkitFullscreenElement'
              : undefined;

        if (fullscreenElementKey && !(fullscreenElementKey in (currentRoot || {}))) {
          // For older Safari versions, use composed node containment check
          return containsComposedNode(currentFullscreenElement, container);
        }

        // Traverse shadow DOM layers looking for our container
        if (fullscreenElementKey) {
          while (currentRoot?.[fullscreenElementKey]) {
            if (currentRoot[fullscreenElementKey] === container) return true;
            if (currentRoot[fullscreenElementKey]?.contains?.(container)) return true;
            currentRoot = currentRoot[fullscreenElementKey]?.shadowRoot;
          }
        }
      }

      return false;
    },
    set(value: boolean, stateOwners: any): void {
      const { container, media } = stateOwners;
      if (!container || !media || !globalThis?.document) return;

      try {
        if (value) {
          // Enter fullscreen
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (media._playbackEngine?.element?.webkitEnterFullscreen) {
            // Safari support (IOS)
            media._playbackEngine.element.webkitEnterFullscreen();
          } else if (container.webkitRequestFullscreen) {
            // Safari support (non IOS)
            container.webkitRequestFullscreen();
          } else if (container.mozRequestFullScreen) {
            // Firefox support
            container.mozRequestFullScreen();
          } else if (container.msRequestFullscreen) {
            // IE/Edge support
            container.msRequestFullscreen();
          }
        } else {
          // Exit fullscreen
          const doc = globalThis.document as any;
          if (doc.exitFullscreen) {
            doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            // Safari support
            doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            // Firefox support
            doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            // IE/Edge support
            doc.msExitFullscreen();
          }
        }
      } catch (error) {
        // Gracefully handle fullscreen API errors (e.g., user interaction required)
        console.warn('Fullscreen operation failed:', error);
      }
    },
    stateOwnersUpdateHandlers: [
      (handler: (value?: boolean) => void, _stateOwners: any): void | (() => void) => {
        if (!globalThis?.document) return;

        const eventHandler = () => handler();
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];

        events.forEach((event) => {
          globalThis.document.addEventListener(event, eventHandler);
        });

        return () => {
          events.forEach((event) => {
            globalThis.document.removeEventListener(event, eventHandler);
          });
        };
      },
    ] as const,
    actions: {
      /** Toggle fullscreen state or explicitly enter/exit based on detail */
      fullscreenrequest: ({ detail }: Pick<CustomEvent<any>, 'detail'> = { detail: undefined }): boolean => {
        // If detail is provided, use it; otherwise toggle current state
        if (typeof detail === 'boolean') {
          return detail;
        }

        // Toggle behavior: check current fullscreen state
        const fullscreenEl = globalThis?.document?.fullscreenElement;
        return !fullscreenEl;
      },
    },
  },
};
