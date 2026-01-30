import { useMediaSelector, useMediaStore } from '@videojs/store/react';
import type { DetailedHTMLProps, HTMLAttributes, PropsWithChildren, RefCallback } from 'react';
import { forwardRef, useCallback } from 'react';
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
      mediaStore.attach({ container: containerElement });
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

    const paused = useMediaSelector((state) => state.paused);
    const play = useMediaSelector((state) => state.play);
    const pause = useMediaSelector((state) => state.pause);

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (!['video', 'audio'].includes((event.target as HTMLElement).localName || '')) return;

        if (paused) {
          play();
        } else {
          pause();
        }
      },
      [paused, play, pause]
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
