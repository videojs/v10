import type { BaseSkinProps } from '../types';

export type VideoSkinProps = BaseSkinProps;

export function VideoSkin(props: VideoSkinProps) {
  const { children } = props;
  return <div>{children}</div>;
}
