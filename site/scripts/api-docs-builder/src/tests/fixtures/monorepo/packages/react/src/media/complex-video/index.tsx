/**
 * Mock React media component.
 *
 * Exercises the source conventions used by real media components:
 * native React video props, a forwarded native-element ref, and a defaults
 * object passed to useSyncProps for Video.js-specific props.
 */
import { complexMediaDefaultProps } from '../../../../core/src/dom/media/complex';

interface VideoHTMLAttributes<Element> {
  element?: Element;
}

interface ComplexVideoProps extends VideoHTMLAttributes<HTMLVideoElement>, Partial<typeof complexMediaDefaultProps> {}

declare function forwardRef<Ref, Props>(render: (props: Props, ref: Ref) => unknown): unknown;
declare function useSyncProps(target: object, props: object, defaults: object): object;

export const ComplexVideo = forwardRef<HTMLVideoElement, ComplexVideoProps>(function ComplexVideo(props, ref) {
  useSyncProps({}, props, complexMediaDefaultProps);
  return { ref };
});
