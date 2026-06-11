import { createPlayer, SeekButton } from '@videojs/react';
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
        <div className="absolute bottom-2.5 left-2.5 flex gap-2">
          <SeekButton
            seconds={-5}
            className="cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 whitespace-nowrap text-black backdrop-blur-[10px]"
            render={(props, state) => (
              <button {...props}>
                {state.direction === 'backward' ? '\u23EA' : '\u23E9'} {5}s
              </button>
            )}
          />
          <SeekButton
            seconds={10}
            className="cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 whitespace-nowrap text-black backdrop-blur-[10px]"
            render={(props, state) => (
              <button {...props}>
                {10}s {state.direction === 'forward' ? '\u23E9' : '\u23EA'}
              </button>
            )}
          />
        </div>
      </Player.Container>
    </Player.Provider>
  );
}
