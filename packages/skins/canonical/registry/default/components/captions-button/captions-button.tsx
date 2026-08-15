import { CaptionsButton as CaptionsButtonPrimitive } from '@videojs/react';
import { CaptionsOffIcon, CaptionsOnIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '@/components/videojs/button-tooltip/button-tooltip';

export function CaptionsButton() {
  return (
    <ButtonTooltip side="top">
      <CaptionsButtonPrimitive className="grid size-media-control min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-pill border-0 bg-transparent p-0 text-center text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 [transition-property:background-color,color,outline-offset,scale] [transition-duration:150ms] [transition-timing-function:ease-out] hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 not-aria-disabled:active:scale-90 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 group/captions">
        <CaptionsOffIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-not-data-active/captions:block group-not-data-active/captions:opacity-100" />
        <CaptionsOnIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-data-active/captions:block group-data-active/captions:opacity-100" />
      </CaptionsButtonPrimitive>
    </ButtonTooltip>
  );
}
