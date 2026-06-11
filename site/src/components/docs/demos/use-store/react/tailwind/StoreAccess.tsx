import { createPlayer, useStore } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function SeekControls() {
  const store = Player.usePlayer();
  const s = useStore(store);

  return (
    <div className="flex gap-1.5 border-t border-black/10 bg-black/5 p-3">
      <button
        type="button"
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1 text-[13px]"
        onClick={() => s.seek(0)}
      >
        Go to start
      </button>
      <button
        type="button"
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1 text-[13px]"
        onClick={() => s.seek(s.state.duration / 2)}
      >
        Go to middle
      </button>
    </div>
  );
}

export default function StoreAccess() {
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
        <SeekControls />
      </Player.Container>
    </Player.Provider>
  );
}
