import { createPlayer, Time } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function CustomNegativeSign() {
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
        <Time.Value
          type="remaining"
          negativeSign="~"
          className="absolute bottom-2.5 left-2.5 rounded-full border border-white/30 bg-white/70 px-5 py-2 text-black tabular-nums backdrop-blur-[10px]"
        />
      </Player.Container>
    </Player.Provider>
  );
}
