import { FullscreenButton as FullscreenButtonPrimitive } from '@videojs/react';
import { FullscreenEnterIcon, FullscreenExitIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '@/components/videojs/button-tooltip/button-tooltip';

export function FullscreenButton() {
  return (
    <ButtonTooltip side="top">
      <FullscreenButtonPrimitive className="grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 group/fullscreen">
        <FullscreenEnterIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-not-data-fullscreen/fullscreen:block group-not-data-fullscreen/fullscreen:opacity-100" />
        <FullscreenExitIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-data-fullscreen/fullscreen:block group-data-fullscreen/fullscreen:opacity-100" />
      </FullscreenButtonPrimitive>
    </ButtonTooltip>
  );
}
