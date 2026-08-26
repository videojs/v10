import {
  Container,
  createPlayer,
  MuteButton,
  PlayButton,
  StatusAnnouncer,
  TimeSlider,
  VolumeSlider,
} from '@videojs/react';
import { Video, videoFeatures } from '@videojs/react/video';

import './BasicUsage.css';

const { Player } = createPlayer({ features: videoFeatures });

export default function BasicUsage() {
  return (
    <Player>
      <Container className="react-status-announcer-basic">
        <Video src="{{VJS10_DEMO_VIDEO_MP4}}" muted playsInline />
        <p className="react-status-announcer-basic__instructions">
          These controls announce status changes to screen readers.
        </p>
        <div className="react-status-announcer-basic__controls">
          <PlayButton
            className="react-status-announcer-basic__button"
            render={(props, state) => (
              <button {...props}>{state.ended ? 'Replay' : state.paused ? 'Play' : 'Pause'}</button>
            )}
          />
          <MuteButton
            className="react-status-announcer-basic__button"
            render={(props, state) => <button {...props}>{state.muted ? 'Unmute' : 'Mute'}</button>}
          />
          <VolumeSlider.Root className="react-status-announcer-basic__volume-slider">
            <VolumeSlider.Track className="react-status-announcer-basic__track">
              <VolumeSlider.Fill className="react-status-announcer-basic__fill" />
            </VolumeSlider.Track>
            <VolumeSlider.Thumb className="react-status-announcer-basic__thumb" />
          </VolumeSlider.Root>
        </div>
        <TimeSlider.Root className="react-status-announcer-basic__time-slider">
          <TimeSlider.Track className="react-status-announcer-basic__track">
            <TimeSlider.Buffer className="react-status-announcer-basic__buffer" />
            <TimeSlider.Fill className="react-status-announcer-basic__fill" />
          </TimeSlider.Track>
          <TimeSlider.Thumb className="react-status-announcer-basic__thumb" />
        </TimeSlider.Root>
        <StatusAnnouncer className="react-status-announcer-basic__announcer" />
      </Container>
    </Player>
  );
}
