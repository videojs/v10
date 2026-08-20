import { AirPlayButton, Container, createPlayer } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="relative">
        <Video className="w-full" src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <AirPlayButton
          className="absolute right-2.5 bottom-2.5 cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 text-black backdrop-blur-[10px] data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:grayscale"
          render={(props, state) => (
            <button {...props}>{state.state === 'connected' ? 'Stop AirPlay' : 'Start AirPlay'}</button>
          )}
        />
      </Container>
    </Player>
  );
}
