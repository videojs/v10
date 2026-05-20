import { cn } from '@videojs/utils/style';
import type { BaseSkinProps } from '../types';

export type BackgroundVideoSkinProps = BaseSkinProps;

/**
 * Ambient background video skin with no user controls.
 *
 * To customize, render `<BackgroundVideo>` directly inside your own wrapper
 * instead of using this preset.
 *
 * @see https://videojs.org/docs/framework/react/concepts/skins
 */
export function BackgroundVideoSkin(props: BackgroundVideoSkinProps) {
  const { children, className, ...rest } = props;
  return (
    <div className={cn('media-background-skin', className)} {...rest}>
      {children}
    </div>
  );
}
