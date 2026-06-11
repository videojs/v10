import { createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const Player = createPlayer({
  features: videoFeatures,
});

function StateDisplay() {
  const state = Player.usePlayer((s) => ({
    paused: s.paused,
    currentTime: s.currentTime,
    duration: s.duration,
  }));

  return (
    <dl className="m-0 flex gap-4 border-t border-black/10 bg-black/5 p-3 text-[13px]">
      <div className="flex gap-2">
        <dt className="text-gray-500">Paused</dt>
        <dd className="m-0 tabular-nums">{String(state.paused)}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-gray-500">Time</dt>
        <dd className="m-0 tabular-nums">
          {state.currentTime.toFixed(1)}s / {state.duration.toFixed(1)}s
        </dd>
      </div>
    </dl>
  );
}

export default function Selector() {
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
        <StateDisplay />
      </Player.Container>
    </Player.Provider>
  );
}
