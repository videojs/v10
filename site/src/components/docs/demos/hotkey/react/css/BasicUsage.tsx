import { Container, createPlayer, Hotkey, PlayButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-hotkey-basic">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline />
        <p className="react-hotkey-basic__instructions">Space: play/pause · M: mute · ←/→: seek</p>
        <PlayButton
          className="react-hotkey-basic__button"
          render={(props, state) => (
            <button {...props}>{state.ended ? 'Replay' : state.paused ? 'Play' : 'Pause'}</button>
          )}
        />
        <Hotkey keys="Space" action="togglePaused" />
        <Hotkey keys="m" action="toggleMuted" />
        <Hotkey keys="ArrowLeft" action="seekStep" value={-5} />
        <Hotkey keys="ArrowRight" action="seekStep" value={5} />
      </Container>
    </Player>
  );
}
