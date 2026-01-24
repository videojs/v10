import { playButtonStateDefinition } from '@videojs/store';
import { shallowEqual } from '@videojs/utils';
import type { DetailedHTMLProps, HTMLAttributes, PropsWithChildren, RefCallback } from 'react';
import { forwardRef, useCallback, useMemo } from 'react';
import { useMediaSelector, useMediaStore } from '@/store';
import { useComposedRefs } from '../utils/use-composed-refs';

/**
 * Hook to associate a React element as the fullscreen container for the media store.
 * This is equivalent to Media Chrome's useMediaFullscreenRef but for VJS-10.
 *
 * The ref callback will register the element as the container state owner
 * in the media store, enabling fullscreen functionality.
 *
 * @example
 * import { useMediaContainerRef } from '@videojs/react';
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
    [mediaStore]
  );
}

/**
 * MediaContainer component that automatically registers itself as the fullscreen container.
 * This provides a simple wrapper component for fullscreen functionality.
 *
 * @example
 * import { MediaContainer } from '@videojs/react';
 *
 * const MyPlayer = () => (
 *   <MediaContainer>
 *     <video src="video.mp4" />
 *     <div>Controls here</div>
 *   </MediaContainer>
 * );
 */
export const MediaContainer: React.ForwardRefExoticComponent<
  PropsWithChildren<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>> &
    React.RefAttributes<HTMLDivElement>
> = forwardRef<HTMLDivElement, PropsWithChildren<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>>>(
  ({ children, ...props }, ref) => {
    const containerRef = useMediaContainerRef();
    const composedRef = useComposedRefs(ref, containerRef);

    const mediaStore = useMediaStore();
    const mediaState = useMediaSelector(playButtonStateDefinition.stateTransform, shallowEqual);
    const methods = useMemo(() => playButtonStateDefinition.createRequestMethods(mediaStore.dispatch), [mediaStore]);

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (!['video', 'audio'].includes((event.target as HTMLElement).localName || '')) return;

        if (mediaState.paused) {
          methods.requestPlay();
        } else {
          methods.requestPause();
        }
      },
      [mediaState.paused, methods]
    );

    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      // biome-ignore lint/a11y/noStaticElementInteractions: container element needs click handling
      // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard events handled by child elements
      <div ref={composedRef} onClick={handleClick} data-media-container {...props}>
        {children}
      </div>
    );
  }
);

MediaContainer.displayName = 'MediaContainer';
