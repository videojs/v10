import { Tooltip } from '@videojs/react';

export default function Grouping() {
  return (
    <div className="flex items-center justify-center px-6 py-10">
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger className="cursor-pointer border border-white/30 bg-white/70 px-4 py-1.5 text-black backdrop-blur-[10px]">
            Play
          </Tooltip.Trigger>
          <Tooltip.Popup className="pointer-events-none m-0 rounded-md border-0 bg-black/85 px-2.5 py-1 text-[13px] whitespace-nowrap text-white backdrop-blur-[10px] [--media-tooltip-side-offset:8px]">
            <Tooltip.Arrow className="fill-black/85" />
            Play video
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="cursor-pointer border border-white/30 bg-white/70 px-4 py-1.5 text-black backdrop-blur-[10px]">
            Mute
          </Tooltip.Trigger>
          <Tooltip.Popup className="pointer-events-none m-0 rounded-md border-0 bg-black/85 px-2.5 py-1 text-[13px] whitespace-nowrap text-white backdrop-blur-[10px] [--media-tooltip-side-offset:8px]">
            <Tooltip.Arrow className="fill-black/85" />
            Mute audio
          </Tooltip.Popup>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger className="cursor-pointer border border-white/30 bg-white/70 px-4 py-1.5 text-black backdrop-blur-[10px]">
            Fullscreen
          </Tooltip.Trigger>
          <Tooltip.Popup className="pointer-events-none m-0 rounded-md border-0 bg-black/85 px-2.5 py-1 text-[13px] whitespace-nowrap text-white backdrop-blur-[10px] [--media-tooltip-side-offset:8px]">
            <Tooltip.Arrow className="fill-black/85" />
            Enter fullscreen
          </Tooltip.Popup>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}
