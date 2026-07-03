import { BufferingIndicator, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player.Provider>
      <Player.Container className="relative flex h-full w-full">
        <Video
          src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM/highest.mp4"
          autoPlay
          muted
          playsInline
          loop
        />
        <BufferingIndicator
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          render={(props, state) => (
            <div {...props}>
              {state.visible && (
                <div className="hidden size-12 animate-spin rounded-full border-4 border-white/30 border-t-white [animation-duration:0.8s] in-data-visible:block" />
              )}
            </div>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
}
