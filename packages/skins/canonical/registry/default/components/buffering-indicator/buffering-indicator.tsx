import { BufferingIndicator as BufferingIndicatorPrimitive } from '@videojs/react';
import { SpinnerIcon } from '@videojs/react/icons';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface BufferingIndicatorProps extends Omit<BufferingIndicatorPrimitive.Props, 'children'> {}

export function BufferingIndicator({ className, ...props }: BufferingIndicatorProps) {
  return (
    <BufferingIndicatorPrimitive
      {...props}
      className={(state) =>
        cn(
          'peer/buffering pointer-events-none absolute inset-0 z-10 hidden place-content-center text-white',
          'not-data-visible:[--media-spinner-animation:none] data-visible:grid',
          resolveClassName(className, state),
        )
      }
    >
      <SpinnerIcon className="size-media-icon drop-shadow-media-icon" />
    </BufferingIndicatorPrimitive>
  );
}
