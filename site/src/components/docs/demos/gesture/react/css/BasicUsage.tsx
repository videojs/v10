import { Container, createPlayer, Gesture, PlayButton } from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-gesture-basic">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline />
        <p className="react-gesture-basic__instructions">Click: play/pause · Double-click: −10s · fullscreen · +10s</p>
        <PlayButton
          className="react-gesture-basic__button"
          render={(props, state) => (
            <button {...props}>{state.ended ? 'Replay' : state.paused ? 'Play' : 'Pause'}</button>
          )}
        />
        <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
        <Gesture type="doubletap" action="seekStep" value={-10} region="left" />
        <Gesture type="doubletap" action="toggleFullscreen" region="center" />
        <Gesture type="doubletap" action="seekStep" value={10} region="right" />
      </Container>
    </Player>
  );
}
