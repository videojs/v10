import { SeekIndicator as SeekIndicatorPrimitive } from '@videojs/react';
import { ChevronIcon } from '@videojs/react/icons';

export function SeekIndicator() {
  return (
    <SeekIndicatorPrimitive.Root className="group/seek-status col-start-2 row-start-1 grid place-content-center gap-1 p-4 text-center data-[direction=backward]:col-start-1 data-[direction=backward]:justify-self-start data-[direction=forward]:col-start-3 data-[direction=forward]:justify-self-end">
      <ChevronIcon className="hidden size-[calc(var(--media-icon-size)*1.5)] group-data-direction/seek-status:block group-data-[direction=backward]/seek-status:[scale:-1_1] transition-[translate,opacity] duration-200 ease-in-out group-data-starting-style/seek-status:opacity-0 group-data-ending-style/seek-status:opacity-0" />
      <SeekIndicatorPrimitive.Value className="tabular-nums" />
    </SeekIndicatorPrimitive.Root>
  );
}
