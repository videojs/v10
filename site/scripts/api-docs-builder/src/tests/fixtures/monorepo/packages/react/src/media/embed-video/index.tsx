import { embedMediaDefaultProps } from '../../../../core/src/dom/media/embed';

interface EmbedVideoProps extends Partial<typeof embedMediaDefaultProps> {}

declare function forwardRef<Ref, Props>(render: (props: Props, ref: Ref) => unknown): unknown;
declare function useSyncProps(target: object, props: object, defaults: object): object;

export const EmbedVideo = forwardRef<HTMLIFrameElement, EmbedVideoProps>(function EmbedVideo(props, ref) {
  useSyncProps({}, props, embedMediaDefaultProps);
  return { ref };
});
