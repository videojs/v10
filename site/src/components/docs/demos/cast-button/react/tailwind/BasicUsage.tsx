import { CastButton, createPlayer } from '@videojs/react';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="relative">
        <HlsJsVideo
          className="w-full"
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8"
          autoPlay
          muted
          playsInline
          loop
        />
        <CastButton
          className="absolute right-2.5 bottom-2.5 cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 text-black backdrop-blur-[10px] data-[availability=unsupported]:hidden"
          render={(props, state) => (
            <button {...props}>{state.castState === 'connected' ? 'Stop casting' : 'Start casting'}</button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
