/**
 * Mock React media component over an inheriting host.
 *
 * Exercises: defaults read off a `static defaultProps` that spreads the parent
 * host's static (mirrors MuxVideo over MuxVideoAdapter extends HlsJsAdapter).
 */
import { ExtendingHost } from '../../../../media/src/dom/extending';

interface VideoHTMLAttributes<Element> {
  element?: Element;
}

interface ExtendingVideoProps extends VideoHTMLAttributes<HTMLVideoElement>, Partial<typeof ExtendingHost.defaultProps> {}

declare function forwardRef<Ref, Props>(render: (props: Props, ref: Ref) => unknown): unknown;
declare function useSyncProps(target: object, props: object, defaults: object): object;

export const ExtendingVideo = forwardRef<HTMLVideoElement, ExtendingVideoProps>(function ExtendingVideo(props, ref) {
  useSyncProps({}, props, ExtendingHost.defaultProps);
  return { ref };
});
