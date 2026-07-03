import { createPlayer, MuteButton, VolumeSlider } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function WithParts() {
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
        <MuteButton
          className="absolute bottom-2.5 left-2.5 cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 text-black backdrop-blur-[10px]"
          render={(props, state) => <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>}
        />
        <VolumeSlider.Root className="absolute right-2.5 bottom-2.5 flex h-5 w-25 cursor-pointer items-center">
          <VolumeSlider.Track className="absolute inset-x-0 h-1 rounded-full bg-white/30 backdrop-blur-[10px] transition-[height] duration-150 in-data-interactive:h-1.5">
            <VolumeSlider.Fill className="absolute top-0 left-0 h-full w-(--media-slider-fill) rounded-full bg-white" />
          </VolumeSlider.Track>
          <VolumeSlider.Thumb className="absolute left-(--media-slider-fill) size-3.5 -translate-x-1/2 scale-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-150 in-data-interactive:scale-100 in-data-dragging:scale-110" />
          <VolumeSlider.Value
            type="pointer"
            className="pointer-events-none absolute bottom-full left-(--media-slider-pointer) mb-1.5 -translate-x-1/2 rounded-sm bg-black/80 px-1.5 py-0.5 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-150 in-data-pointing:opacity-100"
          />
        </VolumeSlider.Root>
      </Player.Container>
    </Player.Provider>
  );
}
