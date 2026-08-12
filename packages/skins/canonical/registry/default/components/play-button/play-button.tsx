import { PlayButton as PlayButtonPrimitive } from '@videojs/react';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/react/icons';
import { ButtonTooltip } from '@/components/videojs/button-tooltip/button-tooltip';

export function PlayButton() {
  return (
    <ButtonTooltip side="top">
      <PlayButtonPrimitive className="grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 group/play">
        <RestartIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-data-ended/play:block group-data-ended/play:opacity-100" />
        <PlayIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-not-data-ended/play:group-data-paused/play:block group-not-data-ended/play:group-data-paused/play:opacity-100 group-not-data-ended/play:group-not-data-started/play:block group-not-data-ended/play:group-not-data-started/play:opacity-100" />
        <PauseIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:block group-data-started/play:group-not-data-paused/play:group-not-data-ended/play:opacity-100" />
      </PlayButtonPrimitive>
    </ButtonTooltip>
  );
}
