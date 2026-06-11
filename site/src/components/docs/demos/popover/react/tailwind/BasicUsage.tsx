import { createPlayer, Popover } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="relative">
        <Video
          className="w-full"
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <div className="absolute bottom-2.5 left-2.5">
          <Popover.Root>
            <Popover.Trigger className="cursor-pointer rounded-full border border-white/30 bg-white/70 px-4 py-1.5 text-black backdrop-blur-[10px]">
              Settings
            </Popover.Trigger>
            <Popover.Popup className="m-0 rounded-lg border-0 bg-black/85 px-4 py-3 text-sm text-white backdrop-blur-[10px] [--media-popover-side-offset:8px]">
              <Popover.Arrow className="fill-black/85" />
              <div className="whitespace-nowrap">Popover content</div>
            </Popover.Popup>
          </Popover.Root>
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
