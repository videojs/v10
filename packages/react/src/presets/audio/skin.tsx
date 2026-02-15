import type { BaseSkinProps } from '../types';

export type AudioSkinProps = BaseSkinProps;

export function AudioSkin(props: AudioSkinProps) {
  const { children } = props;
  return <div>{children}</div>;
}
