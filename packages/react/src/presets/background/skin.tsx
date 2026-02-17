import type { BaseSkinProps } from '../types';

export type BackgroundVideoSkinProps = BaseSkinProps;

export function BackgroundVideoSkin(props: BackgroundVideoSkinProps) {
  const { children } = props;
  return <div>{children}</div>;
}
