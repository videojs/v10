import { MuteButton as MuteButtonPrimitive } from '@videojs/react';
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from '@videojs/react/icons';

export function MuteButton() {
  return (
    <MuteButtonPrimitive className="grid size-media-control shrink-0 place-items-center rounded-media-pill border-0 bg-transparent p-0 text-inherit cursor-pointer outline-2 outline-transparent -outline-offset-2 hover:bg-media-control-hover focus-visible:bg-media-control-hover aria-expanded:bg-media-control-hover focus-visible:outline-current focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 group/mute">
      <VolumeOffIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-data-muted/mute:block group-data-muted/mute:opacity-100" />
      <VolumeLowIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-not-data-muted/mute:group-data-[volume-level=low]/mute:block group-not-data-muted/mute:group-data-[volume-level=low]/mute:opacity-100" />
      <VolumeHighIcon className="size-media-icon drop-shadow-media-icon hidden opacity-0 group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:block group-not-data-muted/mute:group-not-data-[volume-level=low]/mute:opacity-100" />
    </MuteButtonPrimitive>
  );
}
