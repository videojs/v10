import { ErrorDialog as ErrorDialogPrimitive } from '@videojs/react';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface ErrorDialogProps extends Omit<ErrorDialogPrimitive.PopupProps, 'children'> {}

export function ErrorDialog({ className, ...props }: ErrorDialogProps) {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup
        {...props}
        className={(state) =>
          cn(
            'peer/error z-20 flex flex-col gap-3 outline-none',
            'not-data-open:hidden transition-[opacity,scale,transform] delay-100 ease-out',
            'data-starting-style:scale-50 data-starting-style:opacity-0',
            'data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0',
            'motion-reduce:duration-50 motion-reduce:delay-0',
            'bg-media-surface shadow-media-surface [backdrop-filter:blur(var(--media-surface-backdrop-blur))_saturate(var(--media-surface-backdrop-saturate))]',
            'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
            'after:shadow-[inset_0_1px_0_0_var(--media-surface-inner-border),inset_0_0_0_1px_oklch(from_var(--media-surface-inner-border)_l_c_h/calc(alpha*0.5))]',
            'absolute top-1/2 left-1/2 w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 rounded-[1.75rem] p-3 text-white',
            'duration-350',
            resolveClassName(className, state),
          )
        }
      >
        <ErrorDialogPrimitive.Title className={cn('font-semibold leading-tight', 'px-2 pt-2 text-media')} />
        <ErrorDialogPrimitive.Description className={cn('pb-1.5 opacity-70 wrap-anywhere', 'px-2')} />
        <ErrorDialogPrimitive.Close
          className={cn(
            'grid size-media-control min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-pill border-0 bg-transparent p-0 text-center text-inherit',
            'cursor-pointer outline-2 outline-transparent -outline-offset-2',
            '[transition-property:background-color,color,outline-offset,scale] [transition-duration:150ms] [transition-timing-function:ease-out]',
            'hover:bg-media-control-hover hover:text-media-accent-text focus-visible:bg-media-control-hover focus-visible:text-media-accent-text aria-expanded:bg-media-control-hover aria-expanded:text-media-accent-text',
            'focus-visible:outline-media-focus focus-visible:outline-offset-2',
            'not-aria-disabled:active:scale-90',
            'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
            'h-9 w-full bg-media-accent px-4 font-medium text-media-accent-text',
          )}
        />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}
