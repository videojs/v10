import { Tooltip } from '@videojs/react';

export default function BasicUsage() {
  return (
    <div className="flex items-center justify-center px-6 py-10">
      <Tooltip.Root>
        <Tooltip.Trigger className="cursor-pointer rounded-full border border-white/30 bg-white/70 px-4 py-1.5 text-black backdrop-blur-[10px]">
          Hover me
        </Tooltip.Trigger>
        <Tooltip.Popup className="pointer-events-none m-0 rounded-md border-0 bg-black/85 px-2.5 py-1 text-[13px] whitespace-nowrap text-white backdrop-blur-[10px] [--media-tooltip-side-offset:8px]">
          <Tooltip.Arrow className="fill-black/85" />
          <Tooltip.Label>Tooltip content</Tooltip.Label>
        </Tooltip.Popup>
      </Tooltip.Root>
    </div>
  );
}
