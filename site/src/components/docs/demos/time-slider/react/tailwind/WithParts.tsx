import { createPlayer, TimeSlider } from '@videojs/react';
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
        <TimeSlider.Root className="absolute inset-x-0 bottom-0 flex h-5 cursor-pointer items-center">
          <TimeSlider.Track className="absolute inset-x-0 h-1 rounded-full bg-white/30 transition-[height] duration-150 in-data-interactive:h-1.5">
            <TimeSlider.Buffer className="absolute top-0 left-0 h-full w-(--media-slider-buffer) rounded-full bg-white/40" />
            <TimeSlider.Fill className="absolute top-0 left-0 h-full w-(--media-slider-fill) rounded-full bg-white in-data-dragging:w-(--media-slider-pointer)" />
          </TimeSlider.Track>
          <TimeSlider.Thumb className="absolute left-(--media-slider-fill) size-3.5 -translate-x-1/2 scale-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-150 in-data-interactive:scale-100 in-data-dragging:left-(--media-slider-pointer) in-data-dragging:scale-110" />
          <TimeSlider.Value
            type="pointer"
            className="pointer-events-none absolute bottom-full left-(--media-slider-pointer) mb-1.5 -translate-x-1/2 rounded-sm bg-black/80 px-1.5 py-0.5 text-xs whitespace-nowrap text-white opacity-0 transition-opacity duration-150 in-data-pointing:opacity-100"
          />
        </TimeSlider.Root>
      </Player.Container>
    </Player.Provider>
  );
}
