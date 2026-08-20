import { Container, createPlayer, useStore } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player, usePlayer } = createPlayer({
  features: videoFeatures,
});

function SeekControls() {
  const store = usePlayer();
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
    <Player>
      <Container className="relative">
        <Video className="w-full" src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <SeekControls />
      </Container>
    </Player>
  );
}
