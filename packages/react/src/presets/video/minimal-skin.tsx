import type { BaseSkinProps } from '../types';

export type MinimalVideoSkinProps = BaseSkinProps;

export function MinimalVideoSkin(props: MinimalVideoSkinProps) {
  const { children } = props;
  return <div>{children}</div>;
}
