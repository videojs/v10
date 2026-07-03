import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function Controls() {
  const store = Player.usePlayer();

  return (
    <div className="flex gap-1.5 border-t border-black/10 bg-black/5 p-3">
      <button
        type="button"
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1 text-[13px]"
        onClick={() => store.play()}
      >
        Play
      </button>
      <button
        type="button"
        className="cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-1 text-[13px]"
        onClick={() => store.pause()}
      >
        Pause
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
        <Controls />
      </Player.Container>
    </Player.Provider>
  );
}
