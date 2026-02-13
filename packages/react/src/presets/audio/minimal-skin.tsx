import type { BaseSkinProps } from '../types';

export type MinimalAudioSkinProps = BaseSkinProps;

export function MinimalAudioSkin(props: MinimalAudioSkinProps) {
  const { children } = props;
  return <div>{children}</div>;
}
