import { Container, createPlayer, MuteButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function VolumeLevels() {
  return (
    <Player>
      <Container className="relative">
        <Video className="w-full" src="{{VJS10_DEMO_VIDEO_MP4}}" autoPlay muted playsInline loop />
        <MuteButton
          className="absolute bottom-2.5 left-2.5 cursor-pointer rounded-full border border-white/30 bg-white/70 px-5 py-2 text-black backdrop-blur-[10px]"
          render={(props, state) => (
            <button {...props}>
              {state.volumeLevel === 'off'
                ? 'Off'
                : state.volumeLevel === 'low'
                  ? 'Low'
                  : state.volumeLevel === 'medium'
                    ? 'Medium'
                    : 'High'}
            </button>
          )}
        />
      </Container>
    </Player>
  );
}
