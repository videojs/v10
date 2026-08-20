import { Container, createPlayer, useStore } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player, usePlayer } = createPlayer({
  features: videoFeatures,
});

function DerivedState() {
  const store = usePlayer();
  const derived = useStore(store, (s) => ({
    remaining: s.duration - s.currentTime,
    progress: s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0,
  }));

  return (
    <dl className="m-0 flex gap-4 border-t border-black/10 bg-black/5 p-3 text-[13px]">
      <div className="flex gap-2">
        <dt className="text-gray-500">Remaining</dt>
        <dd className="m-0 tabular-nums">{derived.remaining.toFixed(1)}s</dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-gray-500">Progress</dt>
        <dd className="m-0 tabular-nums">{derived.progress.toFixed(1)}%</dd>
      </div>
    </dl>
  );
}

export default function Selector() {
  return (
    <Player>
      <Container className="relative">
        <Video className="w-full" src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <DerivedState />
      </Container>
    </Player>
  );
}
