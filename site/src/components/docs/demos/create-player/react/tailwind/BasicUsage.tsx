import { Container, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player, usePlayer } = createPlayer({
  features: videoFeatures,
});

function Controls() {
  const store = usePlayer();
  const paused = usePlayer((s) => s.paused);

  return (
    <div className="absolute bottom-2.5 left-2.5">
      <button
        type="button"
        className="cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 text-black backdrop-blur-[10px]"
        onClick={() => (paused ? store.play() : store.pause())}
      >
        {paused ? 'Play' : 'Pause'}
      </button>
    </div>
  );
}

export default function BasicUsage() {
  return (
    <Player>
      <Container className="relative">
        <Video className="w-full" src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline />
        <Controls />
      </Container>
    </Player>
  );
}
