import { Container, createPlayer, PlayButton, Poster } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="relative">
        <Video className="w-full" src="{{VJS10_DEMO_VIDEO_MP4}}" playsInline />

        <Poster
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-250 not-data-visible:opacity-0"
          src="{{VJS10_DEMO_POSTER}}"
        />

        <PlayButton
          className="absolute bottom-2.5 left-2.5 cursor-pointer rounded-full border border-white/25 bg-white/75 px-4 py-2 text-black backdrop-blur-[10px]"
          render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}
        />
      </Container>
    </Player>
  );
}
