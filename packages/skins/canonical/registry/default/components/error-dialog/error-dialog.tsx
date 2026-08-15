import { ErrorDialog as ErrorDialogPrimitive } from '@videojs/react';

export function ErrorDialog() {
  return (
    <ErrorDialogPrimitive.Root>
      <ErrorDialogPrimitive.Popup className="bg-media-surface text-media-controls shadow-media-surface backdrop-blur-media-surface absolute top-1/2 left-1/2 z-20 flex w-[calc(100%-1.5rem)] max-w-72 -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[1.75rem] p-3 text-white outline-none not-data-open:hidden transition-[opacity,scale,transform] duration-350 delay-100 ease-out data-starting-style:scale-50 data-starting-style:opacity-0 data-ending-style:scale-50 data-ending-style:opacity-0 data-ending-style:delay-0 motion-reduce:duration-50 motion-reduce:delay-0">
        <ErrorDialogPrimitive.Title className="px-2 pt-2 text-media font-semibold leading-tight" />
        <ErrorDialogPrimitive.Description className="px-2 pb-1.5 opacity-70 wrap-anywhere" />
        <ErrorDialogPrimitive.Close className="grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 h-9 w-full bg-white px-4 font-medium text-black" />
      </ErrorDialogPrimitive.Popup>
    </ErrorDialogPrimitive.Root>
  );
}
