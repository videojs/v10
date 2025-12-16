import type { FC, HTMLProps, PointerEventHandler, PropsWithChildren, RefCallback } from 'react';

import { playButtonStateDefinition } from '@videojs/core-preview/store';
import { shallowEqual } from '@videojs/utils-preview';
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { useMediaSelector, useMediaStore } from '@/store';
import { useComposedRefs } from '../utils/use-composed-refs';

export interface MediaContainerProps extends PropsWithChildren<HTMLProps<HTMLDivElement>> {
  /**
   * Time in milliseconds before the controls autohide. -1 to disable autohide.
   * @default 2000
   */
  autohide?: number;
  /**
   * Whether to autohide the controls when hovering over them.
   * @default false
   */
  autohideOverControls?: boolean;
}

/**
 * Hook to associate a React element as the fullscreen container for the media store.
 * This is equivalent to Media Chrome's useMediaFullscreenRef but for VJS-10.
 *
 * The ref callback will register the element as the container state owner
 * in the media store, enabling fullscreen functionality.
 *
 * @example
 * import { useMediaContainerRef } from '@videojs/react-preview';
 *
 * const PlayerContainer = ({ children }) => {
 *   const containerRef = useMediaContainerRef();
 *   return <div ref={containerRef}>{children}</div>;
 * };
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMediaContainerRef(): RefCallback<HTMLElement | null> {
  const mediaStore = useMediaStore();

  return useCallback(
    (containerElement: HTMLElement | null) => {
      if (!mediaStore) return;

      // Register or unregister the container element as the container state owner
      mediaStore.dispatch({
        type: 'containerstateownerchangerequest',
        detail: containerElement,
      });
    },
    [mediaStore],
  );
}

/**
 * MediaContainer component that automatically registers itself as the fullscreen container.
 * This provides a simple wrapper component for fullscreen functionality.
 *
 * @example
 * import { MediaContainer } from '@videojs/react-preview';
 *
 * const MyPlayer = () => (
 *   <MediaContainer>
 *     <video src="video.mp4" />
 *     <div>Controls here</div>
 *   </MediaContainer>
 * );
 */
export const MediaContainer: FC<MediaContainerProps> = forwardRef(
  ({ children, autohide = 2000, autohideOverControls = false, ...props }, ref) => {
    const containerRef = useMediaContainerRef();
    const internalRef = useRef<HTMLDivElement | null>(null);
    const composedRef = useComposedRefs(ref, containerRef, internalRef);

    const mediaStore = useMediaStore();
    const mediaState = useMediaSelector(playButtonStateDefinition.stateTransform, shallowEqual);
    const methods = useMemo(() => playButtonStateDefinition.createRequestMethods(mediaStore.dispatch), [mediaStore]);

    const [isUserActive, setIsUserActive] = useState(true);
    const [pointerDownTimeStamp, setPointerDownTimeStamp] = useState(0);
    const inactiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const getMediaElement = useCallback((): HTMLMediaElement | null => {
      const media = internalRef.current?.querySelector('video, audio');
      if (media && (media instanceof HTMLMediaElement)) {
        return media;
      }
      return null;
    }, []);

    const handleClick: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
      // Ignore clicks from touch/pen devices
      if (navigator.maxTouchPoints > 0 || event.nativeEvent.pointerType !== 'mouse') return;
      // Ignore clicks not on media elements
      if (!['video', 'audio'].includes((event.target as HTMLElement).localName || '')) return;

      if (mediaState.paused) {
        methods.requestPlay();
      } else {
        methods.requestPause();
      }
    }, [mediaState.paused, methods]);

    const setUserInactive = useCallback(() => {
      if (autohide < 0 || !internalRef.current) return;
      setIsUserActive(false);
    }, [autohide]);

    const scheduleUserInactive = useCallback(() => {
      setIsUserActive(true);
      clearTimeout(inactiveTimeoutRef.current);

      // Setting autohide to -1 turns off autohide
      if (autohide < 0) return;

      inactiveTimeoutRef.current = setTimeout(() => {
        setUserInactive();
      }, autohide);
    }, [autohide, setUserInactive]);

    const handlePointerMove: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
      if (event.nativeEvent.pointerType !== 'mouse') {
        // On mobile we toggle the controls on a tap which is handled in pointerup,
        // but Android fires pointermove events even when the user is just tapping.
        // Prevent calling setActive() on tap because it will mess with the toggle logic.
        const MAX_TAP_DURATION = 250;
        // If the move duration exceeds 250ms then it's a drag and we should show the controls.
        if (event.timeStamp - pointerDownTimeStamp < MAX_TAP_DURATION) return;
      }

      setIsUserActive(true);

      // Stay visible if hovered over control bar
      clearTimeout(inactiveTimeoutRef.current);

      const media = getMediaElement();

      // If hovering over something other than controls, we're free to make inactive
      if ([internalRef.current, media].includes(event.target as HTMLMediaElement) || autohideOverControls) {
        scheduleUserInactive();
      }
    }, [autohideOverControls, getMediaElement, pointerDownTimeStamp, scheduleUserInactive]);

    const handlePointerUp: PointerEventHandler<HTMLDivElement> = useCallback((event) => {
      if (navigator.maxTouchPoints > 0 || event.nativeEvent.pointerType !== 'mouse') {
        const media = getMediaElement();
        if (
          [internalRef.current, media].includes(event.target as HTMLMediaElement)
          && isUserActive
        ) {
          setIsUserActive(false);
        } else {
          scheduleUserInactive();
        }
      } else if (
        event.nativeEvent
          .composedPath()
          .some((element) => {
            if (!(element instanceof HTMLElement)) return false;
            const type = element.getAttribute('data-button');
            if (!type) return false;
            return ['play', 'fullscreen'].includes(type);
          },
          )
      ) {
        scheduleUserInactive();
      }
    }, [getMediaElement, isUserActive, scheduleUserInactive]);

    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        ref={composedRef}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerDown={event => setPointerDownTimeStamp(event.timeStamp)}
        onPointerUp={handlePointerUp}
        onMouseLeave={() => setUserInactive()}
        onKeyUp={() => scheduleUserInactive()}
        data-media-container
        data-controls={isUserActive || mediaState.paused ? 'visible' : 'hidden'}
        {...props}
      >
        {children}
      </div>
    );
  },
);
