'use client';

import type { RefCallback, VideoHTMLAttributes } from 'react';

import { useStoreContext } from '@videojs/store/react';

import { useCallback } from 'react';

import { useComposedRefs } from '../utils/use-composed-refs';

/**
 * Props for the Video component.
 */
export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  /**
   * Optional ref to the video element.
   */
  ref?: RefCallback<HTMLVideoElement> | React.RefObject<HTMLVideoElement>;
}

/**
 * Video element that automatically attaches to the nearest store context.
 *
 * Must be used within a Provider created by `createStore()`.
 * Uses React 19 ref cleanup pattern for automatic detach on unmount.
 *
 * @example
 * ```tsx
 * import { createStore, media } from '@videojs/react';
 *
 * const { Provider } = createStore({ slices: [media.playback] });
 *
 * function App() {
 *   return (
 *     <Provider>
 *       <Video src="video.mp4" controls />
 *       <CustomControls />
 *     </Provider>
 *   );
 * }
 * ```
 */
export function Video({ children, ref, ...props }: VideoProps): React.JSX.Element {
  const store = useStoreContext();

  const attachRef: RefCallback<HTMLVideoElement> = useCallback(
    (el): (() => void) | void => {
      if (el) {
        const detach = store.attach(el);
        // React 19: return cleanup function for automatic detach
        return detach;
      }
    },
    [store],
  );

  const composedRef = useComposedRefs(ref, attachRef);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- captions can be passed via children
    <video ref={composedRef} {...props}>
      {children}
    </video>
  );
}
