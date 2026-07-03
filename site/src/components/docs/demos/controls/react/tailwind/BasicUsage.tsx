import { Controls, createPlayer, PlayButton, Time } from '@videojs/react';
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

        <Controls.Root className="pointer-events-none absolute inset-0 flex items-end bg-linear-to-t from-black/45 to-transparent to-45% p-3 transition-opacity duration-250 not-data-visible:opacity-0">
          <Controls.Group
            className="pointer-events-auto flex w-full items-center justify-between"
            aria-label="Playback controls"
          >
            <PlayButton
              className="cursor-pointer rounded-full border border-white/25 bg-white/75 px-4 py-2 text-sm text-black backdrop-blur-[10px]"
              render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
            />

            <Time.Value
              type="current"
              className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/75 px-4 py-2 text-sm text-black backdrop-blur-[10px]"
            />
          </Controls.Group>
        </Controls.Root>
      </Player.Container>
    </Player.Provider>
  );
}
