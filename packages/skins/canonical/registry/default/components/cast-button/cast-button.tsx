import { CastButton as CastButtonPrimitive } from '@videojs/react';
import { CastEnterIcon, CastExitIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '@/components/videojs/button-tooltip/button-tooltip';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface CastButtonProps extends Omit<CastButtonPrimitive.Props, 'children'> {}

export function CastButton({ className, ...props }: CastButtonProps) {
  return (
    <ButtonTooltip side="top">
      <CastButtonPrimitive
        {...props}
        className={(state) =>
          cn(
            'grid size-media-control min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-pill border-0 bg-transparent p-0 text-center text-inherit',
            'cursor-pointer outline-2 outline-transparent -outline-offset-2',
            '[transition-property:background-color,color,outline-offset,scale] [transition-duration:150ms] [transition-timing-function:ease-out]',
            'hover:bg-media-control-hover hover:text-media-accent-text focus-visible:bg-media-control-hover focus-visible:text-media-accent-text aria-expanded:bg-media-control-hover aria-expanded:text-media-accent-text',
            'focus-visible:outline-media-focus focus-visible:outline-offset-2',
            'not-aria-disabled:active:scale-90',
            'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
            'group/cast',
            resolveClassName(className, state),
          )
        }
      >
        <CastEnterIcon
          className={cn(
            'size-media-icon drop-shadow-media-icon',
            'hidden opacity-0 group-not-data-[cast-state=connected]/cast:block',
            'group-not-data-[cast-state=connected]/cast:opacity-100',
          )}
        />
        <CastExitIcon
          className={cn(
            'size-media-icon drop-shadow-media-icon',
            'hidden opacity-0 group-data-[cast-state=connected]/cast:block',
            'group-data-[cast-state=connected]/cast:opacity-100',
          )}
        />
      </CastButtonPrimitive>
    </ButtonTooltip>
  );
}
