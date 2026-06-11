import { AirPlayButton, createPlayer } from '@videojs/react';
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
        <AirPlayButton
          className="absolute right-2.5 bottom-2.5 cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 text-black backdrop-blur-[10px] data-[availability=unavailable]:cursor-not-allowed data-[availability=unavailable]:opacity-50 data-[availability=unavailable]:grayscale data-[availability=unsupported]:cursor-not-allowed data-[availability=unsupported]:opacity-50 data-[availability=unsupported]:grayscale"
          render={(props, state) => {
            const label =
              state.availability === 'unsupported'
                ? 'AirPlay not supported'
                : state.state === 'connected'
                  ? 'Stop AirPlay'
                  : state.availability === 'unavailable'
                    ? 'No AirPlay devices found'
                    : 'Start AirPlay';
            return <button {...props}>{label}</button>;
          }}
        />
      </Player.Container>
    </Player.Provider>
  );
}
