import { PiPButton as PiPButtonPrimitive } from '@videojs/react';
import { PipEnterIcon, PipExitIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '@/components/videojs/button-tooltip/button-tooltip';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface PiPButtonProps extends Omit<PiPButtonPrimitive.Props, 'children'> {}

export function PiPButton({ className, ...props }: PiPButtonProps) {
  return (
    <ButtonTooltip side="top">
      <PiPButtonPrimitive
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
            'group/pip',
            resolveClassName(className, state),
          )
        }
      >
        <PipEnterIcon
          className={cn(
            'size-media-icon drop-shadow-media-icon',
            'hidden opacity-0 group-not-data-pip/pip:block group-not-data-pip/pip:opacity-100',
          )}
        />
        <PipExitIcon
          className={cn(
            'size-media-icon drop-shadow-media-icon',
            'hidden opacity-0 group-data-pip/pip:block group-data-pip/pip:opacity-100',
          )}
        />
      </PiPButtonPrimitive>
    </ButtonTooltip>
  );
}
