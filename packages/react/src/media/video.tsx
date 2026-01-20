'use client';

import type { Ref, VideoHTMLAttributes } from 'react';

import { useStoreContext } from '@videojs/store/react';

import { useCallback } from 'react';

import { useComposedRefs } from '../utils/use-composed-refs';

export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  ref?: Ref<HTMLVideoElement> | React.RefObject<HTMLVideoElement>;
}

/**
 * Video element that automatically attaches to the nearest store context.
 *
 * Must be used within a Provider created by `createStore()`.
 *
 * @example
 * ```tsx
 * import { createStore, media } from '@videojs/react';
 *
 * const { Provider } = createStore({
 *   features: media.all
 * });
 *
 * function App() {
 *   return (
 *     <Provider>
 *       <Video src="video.mp4" controls />
 *     </Provider>
 *   );
 * }
 * ```
 */
export function Video({ children, ref: refProp, ...props }: VideoProps): React.JSX.Element {
  const store = useStoreContext();

  const attachRef = useCallback(
    (el: HTMLVideoElement): (() => void) | void => {
      if (!el) return;
      return store.attach(el);
    },
    [store],
  );

  const ref = useComposedRefs(refProp, attachRef);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- captions can be passed via children
    <video ref={ref} {...props}>
      {children}
    </video>
  );
}

export namespace Video {
  export type Props = VideoProps;
}
