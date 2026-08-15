import { ErrorDialog as ErrorDialogPrimitive } from '@videojs/react';

export function ErrorDialog({
  variant = 'default',
}: {
  variant?: 'default' | 'minimal';
} = {}) {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup
        className={
          variant === 'minimal'
            ? 'relative bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:shadow-[inset_0_1px_0_0_var(--media-surface-border)] peer/error absolute top-1/2 left-1/2 z-20 flex w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[1.75rem] p-3 text-white outline-none not-data-open:hidden transition-[opacity,scale,transform] duration-350 delay-100 ease-out data-starting-style:scale-50 data-starting-style:opacity-0 data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0 motion-reduce:duration-50 motion-reduce:delay-0 inset-0 top-0 left-0 h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none bg-transparent p-4 shadow-none [backdrop-filter:none] after:hidden duration-(--error-dialog-transition-duration) pointer-events-none [&>*]:pointer-events-auto'
            : 'relative bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] after:shadow-[inset_0_1px_0_0_var(--media-surface-border)] peer/error absolute top-1/2 left-1/2 z-20 flex w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[1.75rem] p-3 text-white outline-none not-data-open:hidden transition-[opacity,scale,transform] duration-350 delay-100 ease-out data-starting-style:scale-50 data-starting-style:opacity-0 data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0 motion-reduce:duration-50 motion-reduce:delay-0'
        }
      >
        <ErrorDialogPrimitive.Title
          className={
            variant === 'minimal'
              ? 'px-2 pt-2 text-media font-semibold leading-tight w-full max-w-64 px-0 pt-1.5 text-[calc(var(--media-font-size)*1.15)]'
              : 'px-2 pt-2 text-media font-semibold leading-tight'
          }
        />
        <ErrorDialogPrimitive.Description
          className={
            variant === 'minimal'
              ? 'px-2 pb-1.5 opacity-70 wrap-anywhere w-full max-w-64 px-0'
              : 'px-2 pb-1.5 opacity-70 wrap-anywhere'
          }
        />
        <ErrorDialogPrimitive.Close
          className={
            variant === 'minimal'
              ? 'grid size-media-control min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-pill border-0 bg-transparent p-0 text-center text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 [transition-property:background-color,color,outline-offset,scale] [transition-duration:150ms] [transition-timing-function:ease-out] hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 not-aria-disabled:active:scale-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 h-9 w-full bg-white px-4 font-medium text-black max-w-64'
              : 'grid size-media-control min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-pill border-0 bg-transparent p-0 text-center text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 [transition-property:background-color,color,outline-offset,scale] [transition-duration:150ms] [transition-timing-function:ease-out] hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 not-aria-disabled:active:scale-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 h-9 w-full bg-white px-4 font-medium text-black'
          }
        />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}
